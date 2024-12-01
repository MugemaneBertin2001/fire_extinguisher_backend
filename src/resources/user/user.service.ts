import { HashingService } from './hashing.service';
import { UserRepository } from './user.repository';
import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
  ) {}

  /**
   * Register a new user
   * @param createUserInput User creation data
   * @returns Created user
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    const { email, phone, password } = createUserInput;

    // Check if user exists with email or phone in one query
    const existingUser =
      (await this.userRepository.findByIdentifier(email)) ||
      (await this.userRepository.findByIdentifier(phone));

    if (existingUser) {
      const conflictField =
        existingUser.email === email ? 'email' : 'phone number';
      throw new ConflictException(`The ${conflictField} is already in use`);
    }

    // Hash password before saving it to DB
    const hashedPassword = await this.hashingService.hashPassword(password);

    // Create and save the user
    return this.userRepository.createUser({
      ...createUserInput,
      password: hashedPassword,
    });
  }
}
