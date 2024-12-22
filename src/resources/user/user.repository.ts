import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource, Repository, In } from 'typeorm';
import { Cache } from 'cache-manager';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepository {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'user:';
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.userRepository = userRepository;
  }

  private getCacheKey(identifier: string): string {
    return `${this.CACHE_PREFIX}${identifier}`;
  }

  private async cacheUser(user: User): Promise<void> {
    if (user) {
      const emailKey = this.getCacheKey(user.email);
      const phoneKey = this.getCacheKey(user.phone);
      const idKey = this.getCacheKey(user.id);

      await Promise.all([
        this.cacheManager.set(emailKey, user, this.CACHE_TTL),
        this.cacheManager.set(phoneKey, user, this.CACHE_TTL),
        this.cacheManager.set(idKey, user, this.CACHE_TTL),
      ]);
    }
  }

  private async invalidateUserCache(user: User): Promise<void> {
    const emailKey = this.getCacheKey(user.email);
    const phoneKey = this.getCacheKey(user.phone);
    const idKey = this.getCacheKey(user.id);

    await Promise.all([
      this.cacheManager.del(emailKey),
      this.cacheManager.del(phoneKey),
      this.cacheManager.del(idKey),
    ]);
  }

  /**
   * Create a new user with transaction and cache support
   */
  async createUser(createUserInput: CreateUserInput): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { email, phone } = createUserInput;

      // Check existing users with a single query
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email }, { phone }],
        select: ['id', 'email', 'phone'],
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'phone';
        throw new ConflictException(`A user with this ${field} already exists`);
      }

      const user = queryRunner.manager.create(User, createUserInput);
      const savedUser = await queryRunner.manager.save(User, user);
      await queryRunner.commitTransaction();

      // Cache the new user
      await this.cacheUser(savedUser);

      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find user by field with cache support
   */
  private async findByField(
    field: 'email' | 'phone' | 'id',
    value: string,
  ): Promise<User | null> {
    // Try cache first
    const cacheKey = this.getCacheKey(value);
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // Query database if not in cache
    const user = await this.userRepository.findOne({
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

    if (user) {
      await this.cacheUser(user);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByField('email', email);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.findByField('phone', phone);
  }

  /**
   * Find user by identifier with cache support
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // Try cache first
    const cacheKey = this.getCacheKey(identifier);
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // Query database if not in cache
    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });

    if (user) {
      await this.cacheUser(user);
    }

    return user;
  }

  /**
   * Bulk create users with optimized transaction
   */
  async createUsers(users: CreateUserInput[]): Promise<User[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for duplicates in a single query
      const emails = users.map(user => user.email);
      const phones = users.map(user => user.phone);

      const existingUsers = await queryRunner.manager.find(User, {
        where: [
          { email: In(emails) },
          { phone: In(phones) },
        ],
        select: ['email', 'phone'],
      });

      if (existingUsers.length > 0) {
        throw new ConflictException('Some users already exist');
      }

      const userEntities = queryRunner.manager.create(User, users);
      const savedUsers = await queryRunner.manager.save(User, userEntities);
      await queryRunner.commitTransaction();

      // Cache all new users
      await Promise.all(savedUsers.map(user => this.cacheUser(user)));

      return savedUsers;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update user with optimized transaction and cache
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
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

      // Invalidate old cache and set new cache
      await this.invalidateUserCache(updatedUser);
      await this.cacheUser(updatedUser);

      return updatedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}