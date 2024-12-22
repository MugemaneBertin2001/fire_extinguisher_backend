import {
  Injectable,
  HttpStatus,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { memoize } from 'lodash';

import { HashingService } from './hashing.service';
import { UserRepository } from './user.repository';
import { EmailService } from '../email/email.service';
import { AuthJwtService } from './jwt.service';

import { RegistrationFields } from './dto/create-user.input';
import { LoginResponse } from './dto/login-user.input';
import { Response, VerificationResponse } from './dto/response.input';
import { NewPasswordInput } from './dto/new-password.Input';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly USER_CACHE_TTL = 3600; 

  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly authJwtService: AuthJwtService,
    private readonly loggerService: Logger,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject('USER_QUEUE') private readonly userQueue: Queue,
  ) {}

  /**
   * Generate a verification token with OTP
   * Memoized to prevent multiple generations in the same request
   */
  private readonly memoizedTokenGenerator = memoize(
    (email: string, role?: UserRole): string => {
      const otp = crypto.randomInt(100000, 999999).toString();
      return this.authJwtService.generateToken(
        { email, otp, ...(role && { role }) },
        process.env.JWT_EXPIRES_IN,
      );
    },
    (email: string, role?: UserRole) => `${email}:${role}`
  );

  /**
   * Generate a verification token with OTP
   */
  private generateVerificationToken(email: string, role?: UserRole): string {
    return this.memoizedTokenGenerator(email, role);
  }

  /**
   * Handle common error logging and throwing
   */
  private handleError(
    context: string,
    error: any,
    defaultMessage: string,
  ): never {
    this.loggerService.error(`${context}:`, error.message || error);

    if (
      error instanceof BadRequestException ||
      error instanceof UnauthorizedException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(defaultMessage);
  }

  /**
   * Validate password confirmation
   */
  private validatePasswordConfirmation(
    password: string,
    confirmPassword: string,
  ): void {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
  }

  /**
   * Find user with caching
   */
  private async findUserWithCache(email: string): Promise<User> {
    const cacheKey = `${this.USER_CACHE_PREFIX}${email}`;
    
    // Try to get from cache first
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // If not in cache, get from database
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Store in cache for future requests
    await this.cacheManager.set(cacheKey, user, this.USER_CACHE_TTL);
    return user;
  }

  /**
   * Register a new user with optimized parallel operations
   */
  async create(createUserInput: RegistrationFields): Promise<Response> {
    const { email, phone, password, confirmPassword } = createUserInput;

    this.validatePasswordConfirmation(password, confirmPassword);

    // Run user existence checks in parallel
    const [existingUserByEmail, existingUserByPhone] = await Promise.all([
      this.userRepository.findByIdentifier(email),
      this.userRepository.findByIdentifier(phone)
    ]);

    if (existingUserByEmail || existingUserByPhone) {
      const conflictField = existingUserByEmail ? 'email' : 'phone number';
      throw new ConflictException(`The ${conflictField} is already in use`);
    }

    try {
      // Run password hashing and token generation in parallel
      const [hashedPassword, verificationToken] = await Promise.all([
        this.hashingService.hashPassword(password),
        this.generateVerificationToken(email, UserRole.CLIENT)
      ]);

      // Create user and queue email sending in parallel
      await Promise.all([
        this.userRepository.createUser({
          ...createUserInput,
          password: hashedPassword,
          role: UserRole.CLIENT,
          verificationToken,
        }),
        this.userQueue.add('sendVerificationEmail', {
          email,
          otp: this.authJwtService.validateToken(verificationToken).otp
        }, {
          priority: 2,
          attempts: 3
        })
      ]);

      return {
        message: 'User created successfully, please verify your email with the OTP sent.',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this.handleError(
        'Failed to create user',
        error,
        'Failed to create user or send OTP email',
      );
    }
  }

  /**
   * Verify user account with optimized token validation
   */
  async verifyAccount(email: string, otp: string): Promise<Response> {
    const user = await this.findUserWithCache(email);

    try {
      const decoded = this.authJwtService.validateToken(user.verificationToken);

      if (decoded.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      await Promise.all([
        this.userRepository.updateUser(user.id, {
          verified: true,
          verificationToken: null,
        }),
        this.userQueue.add('sendConfirmationEmail', { email }, {
          priority: 1,
          attempts: 3
        })
      ]);

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        message: 'User successfully verified',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Account verification failed',
        error,
        'Invalid or expired verification token',
      );
    }
  }

  /**
   * Optimized login process with parallel operations
   */
  async login(email: string, password: string): Promise<Response> {
    const user = await this.findUserWithCache(email);

    try {
      const isPasswordValid = await this.hashingService.comparePassword(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.verified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      // Generate token and update user in parallel
      const verificationToken = this.generateVerificationToken(email, user.role);
      const otp = this.authJwtService.validateToken(verificationToken).otp;

      await Promise.all([
        this.userRepository.updateUser(user.id, { verificationToken }),
        this.userQueue.add('sendTwoFactorAuthEmail', { email, otp }, {
          priority: 1,
          attempts: 3
        })
      ]);

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        message: 'We have sent an email with OTP (One-Time Password)',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Login process failed',
        error,
        'An error occurred while processing the login request',
      );
    }
  }

  /**
   * Verify login with optimized token handling
   */
  async verifyLogin(email: string, otp: string): Promise<LoginResponse> {
    const user = await this.findUserWithCache(email);

    try {
      if (!user.verificationToken) {
        throw new UnauthorizedException(
          'Unauthorized access, Initiate login first to get verification token',
        );
      }

      const jwtData = this.authJwtService.validateToken(user.verificationToken);

      if (jwtData.email !== email || jwtData.otp !== otp) {
        throw new UnauthorizedException('Unauthorized access');
      }

      const [accessToken, refreshToken] = await Promise.all([
        this.authJwtService.generateToken(
          { email: user.email, role: user.role },
          process.env.JWT_EXPIRES_IN,
        ),
        this.authJwtService.generateToken(
          { id: user.id, email: user.email, role: user.role },
          '7d',
        )
      ]);

      await this.userRepository.updateUser(user.id, {
        verificationToken: null,
      });

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        accessToken,
        refreshToken,
        message: 'Login successful',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Login verification failed',
        error,
        'An error occurred while processing the login verification request',
      );
    }
  }

  /**
   * Resend verification OTP with optimized token generation
   */
  async resendVerificationOtp(email: string): Promise<Response> {
    const user = await this.findUserWithCache(email);

    try {
      if (user.verified) {
        throw new BadRequestException('User is already verified.');
      }

      const newVerificationToken = this.generateVerificationToken(email, user.role);
      const otp = this.authJwtService.validateToken(newVerificationToken).otp;

      await Promise.all([
        this.userRepository.updateUser(user.id, { verificationToken: newVerificationToken }),
        this.userQueue.add('sendVerificationEmail', { email, otp }, {
          priority: 2,
          attempts: 3
        })
      ]);

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        message: 'Verification OTP resent successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Failed to resend verification OTP',
        error,
        'An error occurred while processing the resend verification OTP request',
      );
    }
  }

  /**
   * Initiate password reset with optimized email handling
   */
  async forgetPassword(email: string): Promise<Response> {
    const user = await this.findUserWithCache(email);

    try {
      const verificationToken = this.generateVerificationToken(email);
      const otp = this.authJwtService.validateToken(verificationToken).otp;

      await Promise.all([
        this.userRepository.updateUser(user.id, { verificationToken }),
        this.userQueue.add('sendForgetPasswordEmail', { email, otp }, {
          priority: 2,
          attempts: 3
        })
      ]);

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        message: 'Password reset email sent successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Password reset initiation failed',
        error,
        'An error occurred while processing the password reset request',
      );
    }
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordReset(
    email: string,
    otp: string,
  ): Promise<VerificationResponse> {
    const user = await this.findUserWithCache(email);

    try {
      const decoded = this.authJwtService.validateToken(user.verificationToken);

      if (decoded.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      return {
        message: 'User is allowed to reset password',
        verificationToken: user.verificationToken,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Password reset verification failed',
        error,
        'Invalid or expired verification token',
      );
    }
  }

  /**
   * Replace forgotten password with optimized validation
   */
  async replaceForgotPassword(input: NewPasswordInput): Promise<Response> {
    const { newPassword, confirmPassword, email, verificationToken } = input;

    // Validate required fields
    const missingFields = [
      !newPassword && 'newPassword',
      !confirmPassword && 'confirmPassword',
      !email && 'email',
      !verificationToken && 'verificationToken',
    ].filter(Boolean);

    if (missingFields.length) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}.`,
      );
    }

    try {
      // Validate token and get user in parallel
      const [decodedData, user] = await Promise.all([
        this.authJwtService.validateToken(verificationToken),
        this.findUserWithCache(email)
      ]);

      if (decodedData.email !== email) {
        throw new UnauthorizedException('Access denied');
      }

      this.validatePasswordConfirmation(newPassword, confirmPassword);

      const hashedPassword = await this.hashingService.hashPassword(newPassword);
      await this.userRepository.updateUser(user.id, {
        password: hashedPassword,
        verificationToken: null
      });

      // Invalidate cache after update
      await this.cacheManager.del(`${this.USER_CACHE_PREFIX}${email}`);

      return {
        message: 'Password updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this.handleError(
        'Password replacement failed',
        error,
        'An unexpected error occurred during password reset',
      );
    }
  }
}