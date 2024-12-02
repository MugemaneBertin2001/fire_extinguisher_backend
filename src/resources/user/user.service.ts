import { HashingService } from './hashing.service';
import { UserRepository } from './user.repository';
import {
  Injectable,
  ConflictException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegistrationFields } from './dto/create-user.input';
import { EmailService } from '../email/email.service';
import { AuthJwtService } from './jwt.service';
import * as crypto from 'crypto';
import { UserRole } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly AuthJwtService: AuthJwtService,
  ) {}

  /**
   * Register a new user
   * @param createUserInput User creation data
   * @returns Response object with status and message
   */
  async create(
    createUserInput: RegistrationFields,
  ): Promise<{ message: string; status: number }> {
    const { email, phone, password } = createUserInput;
    const role = UserRole.CLIENT;

    const existingUser =
      (await this.userRepository.findByIdentifier(email)) ||
      (await this.userRepository.findByIdentifier(phone));

    if (existingUser) {
      const conflictField =
        existingUser.email === email ? 'email' : 'phone number';
      throw new ConflictException(`The ${conflictField} is already in use`);
    }

    const hashedPassword = await this.hashingService.hashPassword(password);

    // Generate OTP and verification token
    const otp = crypto.randomInt(100000, 999999).toString();
    const verificationToken = this.AuthJwtService.generateToken(
      {
        email,
        otp,
        role,
      },
      process.env.JWT_EXPIRES_IN,
    );

    await this.userRepository.createUser({
      ...createUserInput,
      password: hashedPassword,
      role,
      verificationToken,
    });

    try {
      await this.emailService.sendVerificationEmail(email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return {
        message: 'Failed to send OTP email',
        status: 500,
      };
    }

    return {
      message:
        'User created successfully, please verify your email with the OTP sent.',
      status: HttpStatus.CREATED,
    };
  }

  /**
   * Verify OTP and activate user
   * @param email User's email address
   * @param otp One-time password sent to the user's email
   * @returns Response object with status and message
   */
  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ message: string; status: number }> {
    const user = await this.userRepository.findByIdentifier(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    try {
      const decoded = this.AuthJwtService.validateToken(user.verificationToken);

      if (decoded.otp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }
      user.verified = true;
      this.userRepository.updateUser(user.id, user);
      this.emailService.sendConfirmationEmail(user.email)

      return {
        message: 'User successfully verified',
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error('Error during OTP verification:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired verification token');
    }
  }
}
