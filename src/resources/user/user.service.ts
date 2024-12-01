import { HashingService } from './hashing.service';
import { UserRepository } from './user.repository';
import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { User } from './entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user
   * @param createUserInput User creation data
   * @returns Created user
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    const { email, phone, password } = createUserInput;

    const existingUser =
      (await this.userRepository.findByIdentifier(email)) ||
      (await this.userRepository.findByIdentifier(phone));

    if (existingUser) {
      const conflictField =
        existingUser.email === email ? 'email' : 'phone number';
      throw new ConflictException(`The ${conflictField} is already in use`);
    }

    const hashedPassword = await this.hashingService.hashPassword(password);

    const user = await this.userRepository.createUser({
      ...createUserInput,
      password: hashedPassword,
    });

    try {
      await this.emailService.sendWelcomeEmail(email, 'New user!');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return user;
  }
}
