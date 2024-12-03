import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import {
  RegistrationFields,
  VerificationFields,
} from './dto/create-user.input';
import { Response } from './dto/response.input';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { LoginInput, LoginResponse } from './dto/login-user.input';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => Response)
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Args('createUserInput') createUserInput: RegistrationFields,
  ): Promise<Response> {
    const result = await this.userService.create(createUserInput);
    return result;
  }

  @Mutation(() => Response)
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Args('verificationFields') verificationFields: VerificationFields,
  ): Promise<Response> {
    const isVerified = await this.userService.verifyOtp(
      verificationFields.email,
      verificationFields.otp,
    );
    return isVerified;
  }

  @Mutation(() => LoginResponse)
  async login(
    @Args('loginInput') loginInput: LoginInput,
  ): Promise<LoginResponse> {
    const { email, password } = loginInput;
    return this.userService.login(email, password);
  }
}
