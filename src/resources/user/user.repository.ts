import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';

@Injectable()
export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Creates and manages a QueryRunner instance
   */
  private async createQueryRunner(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    return queryRunner;
  }

  /**
   * Create a new user with unique constraint checks
   * @param createUserInput User creation data
   * @returns Created user
   */
  async createUser(createUserInput: CreateUserInput): Promise<User> {
    const queryRunner = await this.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { email, phone } = createUserInput;

      // Check for existing user by email or phone
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email }, { phone }],
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email or phone number already exists',
        );
      }

      // Create and save the new user
      const user = queryRunner.manager.create(User, createUserInput);
      const savedUser = await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    const queryRunner = await this.createQueryRunner();

    try {
      return await queryRunner.manager.findOne(User, {
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
    } finally {
      await queryRunner.release();
    }
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
    const queryRunner = await this.createQueryRunner();

    try {
      return await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .where('user.email = :identifier OR user.phone = :identifier', {
          identifier,
        })
        .getOne();
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk create users with transaction support
   * @param users Array of user creation inputs
   * @returns Created users
   */
  async createUsers(users: CreateUserInput[]): Promise<User[]> {
    const queryRunner = await this.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const userEntities = queryRunner.manager.create(User, users);
      const savedUsers = await queryRunner.manager.save(userEntities);

      await queryRunner.commitTransaction();
      return savedUsers;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update user partially with transaction support
   * @param id User ID
   * @param updateData Partial update data
   * @returns Updated user
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const queryRunner = await this.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.manager.update(User, id, updateData);

      if (result.affected === 0) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await queryRunner.manager.findOne(User, {
        where: { id },
      });
      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      await queryRunner.commitTransaction();
      return updatedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
