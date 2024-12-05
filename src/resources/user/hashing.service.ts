import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashingService implements OnModuleInit {
  private salt: string;

  private readonly defaultSaltRounds = parseInt(process.env.SALT_ROUNDS);

  async onModuleInit() {
    const saltRounds =
      parseInt(process.env.SALT_ROUNDS) || this.defaultSaltRounds;
    this.salt = await bcrypt.genSalt(saltRounds);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.salt);
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
