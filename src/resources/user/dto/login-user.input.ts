import { IsEmail, IsString, MinLength } from 'class-validator';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @IsEmail()
  @Field()
  email: string;

  @IsString()
  @MinLength(6)
  @Field()
  password: string;
}

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  message: string;

  @Field(() => Int)
  status: number;
}

@InputType()
export class VerifyLoginInput {
  @IsEmail()
  @Field()
  email: string;

  @IsString()
  @MinLength(6)
  @Field()
  otp: string;
}
