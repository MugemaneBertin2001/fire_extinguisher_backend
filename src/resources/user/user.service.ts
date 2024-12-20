import {
  Injectable,
  HttpStatus,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import * as crypto from 'crypto';

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
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly authJwtService: AuthJwtService,
    private readonly loggerService: Logger,
  ) {}

  /**
   * Generate a verification token with OTP
   * @param email User's email
   * @param role User's role
   * @returns Verification token
   */
  private generateVerificationToken(email: string, role?: UserRole): string {
    const otp = crypto.randomInt(100000, 999999).toString();
    return this.authJwtService.generateToken(
      { email, otp, ...(role && { role }) },
      process.env.JWT_EXPIRES_IN,
    );
  }

  /**
   * Handle common error logging and throwing
   * @param context Error context
   * @param error Error object
   * @param defaultMessage Default error message
   * @throws InternalServerErrorException
   */
  private handleError(
    context: string,
    error: any,
    defaultMessage: string,
  ): never {
    this.loggerService.error(`${context}:`, error.message || error);

    // Re-throw specific exceptions
    if (
      error instanceof BadRequestException ||
      error instanceof UnauthorizedException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(defaultMessage);
  }

  /**
   * Validate password confirmation
   * @param password Primary password
   * @param confirmPassword Confirmation password
   * @throws BadRequestException if passwords don't match
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
   * Register a new user
   */
  async create(createUserInput: RegistrationFields): Promise<Response> {
    const { email, phone, password, confirmPassword } = createUserInput;

    this.validatePasswordConfirmation(password, confirmPassword);

    const existingUser =
      (await this.userRepository.findByIdentifier(email)) ||
      (await this.userRepository.findByIdentifier(phone));

    if (existingUser) {
      const conflictField =
        existingUser.email === email ? 'email' : 'phone number';
      throw new ConflictException(`The ${conflictField} is already in use`);
    }

    const role = UserRole.CLIENT;
    const hashedPassword = await this.hashingService.hashPassword(password);
    const verificationToken = this.generateVerificationToken(email, role);

    try {
      await this.userRepository.createUser({
        ...createUserInput,
        password: hashedPassword,
        role,
        verificationToken,
      });
      this.sendVerificationEmail(email, verificationToken);

      return {
        message:
          'User created successfully, please verify your email with the OTP sent.',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this.handleError(
        'Failed to create user',
        error,
        'Failed to send OTP email',
      );
    }
}
private async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
  const otp = this.authJwtService.validateToken(verificationToken).otp;
  await this.emailService.sendVerificationEmail(email, otp);
}
  /**
   * Verify user account
   */
  async verifyAccount(email: string, otp: string): Promise<Response> {
    const user = await this.findUserByEmail(email);

    try {
      const decoded = this.authJwtService.validateToken(user.verificationToken);

      if (decoded.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      await this.userRepository.updateUser(user.id, {
        verified: true,
        verificationToken: null,
      });

      await this.emailService.sendConfirmationEmail(user.email);

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
   * Find user by email with error handling
   */
  private async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  /**
   * Initiate login process
   */
  async login(email: string, password: string): Promise<Response> {
    const user = await this.findUserByEmail(email);

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

      // Generate and send OTP
      const verificationToken = this.generateVerificationToken(
        email,
        user.role,
      );
      await this.userRepository.updateUser(user.id, { verificationToken });
      await this.emailService.sendTwoFactorAuthEmail(
        email,
        this.authJwtService.validateToken(verificationToken).otp,
      );

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
   * Verify login with OTP
   */
  async verifyLogin(email: string, otp: string): Promise<LoginResponse> {
    const user = await this.findUserByEmail(email);

    try {
      if (!user.verificationToken) {
        throw new UnauthorizedException(
          'Unauthorized access, Initate login first to get verification token',
        );
      }
      const jwtData = this.authJwtService.validateToken(user.verificationToken);

      if (jwtData.email !== email || jwtData.otp !== otp) {
        throw new UnauthorizedException('Unauthorized access');
      }

      const accessToken = this.authJwtService.generateToken(
        { email: user.email, role: user.role },
        process.env.JWT_EXPIRES_IN,
      );

      const refreshToken = this.authJwtService.generateToken(
        { id: user.id, email: user.email, role: user.role },
        '7d',
      );
      await this.userRepository.updateUser(user.id, {
        verificationToken: null,
      });

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
   * Resend verification OTP
   */
  async resendVerificationOtp(email: string): Promise<Response> {
    const user = await this.findUserByEmail(email);

    try {
      if (user.verified) {
        throw new BadRequestException('User is already verified.');
      }

      // Generate new OTP and verification token
      const newVerificationToken = this.generateVerificationToken(email, user.role);
      await this.userRepository.updateUser(user.id, { verificationToken: newVerificationToken });

      // Send new OTP email
      await this.emailService.sendVerificationEmail(
        email,
        this.authJwtService.validateToken(newVerificationToken).otp,
      );

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
   * Initiate password reset
   */
  async forgetPassword(email: string): Promise<Response> {
    const user = await this.findUserByEmail(email);

    try {
      const verificationToken = this.generateVerificationToken(email);
      await this.userRepository.updateUser(user.id, { verificationToken });

      await this.emailService.sendForgetPasswordEmail(
        email,
        this.authJwtService.validateToken(verificationToken).otp,
      );

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
    const user = await this.findUserByEmail(email);

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
   * Replace forgotten password
   */
  async replaceForgotPassword(input: NewPasswordInput): Promise<Response> {
    this.validatePasswordResetInput(input);

    const { newPassword, confirmPassword, email, verificationToken } = input;

    try {
      // Validate verification token
      const decodedData = this.authJwtService.validateToken(verificationToken);

      if (decodedData.email !== email) {
        throw new UnauthorizedException('Access denied');
      }

      // Validate passwords
      this.validatePasswordConfirmation(newPassword, confirmPassword);

      // Get and update user
      const user = await this.findUserByEmail(email);
      await this.updateUserPassword(user, newPassword);

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

  /**
   * Validate password reset input
   */
  private validatePasswordResetInput(input: NewPasswordInput): void {
    const { newPassword, confirmPassword, email, verificationToken } = input;

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
  }

  /**
   * Update user password
   */
  private async updateUserPassword(
    user: User,
    newPassword: string,
  ): Promise<void> {
    const hashedPassword = await this.hashingService.hashPassword(newPassword);

    const updatedUser = await this.userRepository.updateUser(user.id, {
      ...user,
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new InternalServerErrorException('Failed to update password.');
    }
  }
}
