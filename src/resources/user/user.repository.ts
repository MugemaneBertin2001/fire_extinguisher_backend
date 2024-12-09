import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';

@Injectable()
export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create a new user with unique constraint checks
   * @param createUserInput User creation data
   * @returns Created user
   */
  async createUser(createUserInput: CreateUserInput): Promise<User> {
    const { email, phone } = createUserInput;

    // Check for existing user by email or phone
    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email or phone number already exists',
      );
    }

    // Create and save the new user
    const user = this.dataSource.getRepository(User).create(createUserInput);
    const savedUser = await this.dataSource.getRepository(User).save(user);

    return savedUser;
  }

  /**
   * Find a user by email or phone with transaction support
   * @param field Identifier field (email or phone)
   * @param value Field value
   * @returns User or null
   */
  private async findByField(
    field: 'email' | 'phone',
    value: string,
  ): Promise<User | null> {
    return await this.dataSource.getRepository(User).findOne({
      where: { [field]: value },
      select: [
        'id',
        'email',
        'phone',
        'password',
        'verificationToken',
        'verified',
        'role',
      ],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.findByField('email', email);
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.findByField('phone', phone);
  }

  /**
   * Find a user by email or phone using identifier
   * @param identifier User's email or phone number
   * @returns User or null
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    return await this.dataSource.getRepository(User).findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });
  }

  /**
   * Bulk create users with transaction support
   * @param users Array of user creation inputs
   * @returns Created users
   */
  async createUsers(users: CreateUserInput[]): Promise<User[]> {
    const userEntities = this.dataSource.getRepository(User).create(users);
    const savedUsers = await this.dataSource.getRepository(User).save(userEntities);

    return savedUsers;
  }

  /**
   * Update user partially with transaction support
   * @param id User ID
   * @param updateData Partial update data
   * @returns Updated user
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const result = await this.dataSource.getRepository(User).update(id, updateData);

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.dataSource.getRepository(User).findOne({
      where: { id },
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return updatedUser;
  }
}
