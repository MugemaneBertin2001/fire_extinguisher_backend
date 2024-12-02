import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { RegistrationFields } from './dto/create-user.input';
import { Response } from './dto/response.input';
import { HttpCode, HttpStatus } from '@nestjs/common';

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
    @Args('email') email: string,
    @Args('otp') otp: string,
  ): Promise<Response> {
    const isVerified = await this.userService.verifyOtp(email, otp);
    return isVerified;
  }
}
