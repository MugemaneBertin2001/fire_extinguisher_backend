import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  phone: string;

  @Field()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @Field()
  verificationToken: string;

  @Field(() => UserRole)
  @IsNotEmpty()
  @IsEnum(UserRole, {
    message: 'Role must be one of Admin, Manager, Client, or Technician',
  })
  role: UserRole;
}

@InputType()
export class RegistrationFields {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  phone: string;

  @Field()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

