import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import {
  RegistrationFields,
  VerificationFields,
} from './dto/create-user.input';
import { Response, VerificationResponse } from './dto/response.input';
import { HttpCode, HttpStatus } from '@nestjs/common';
import {
  LoginInput,
  LoginResponse,
  VerifyLoginInput,
} from './dto/login-user.input';
import { NewPasswordInput } from './dto/new-password.Input';

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
    const verifiedUser = await this.userService.verifyAccount(
      verificationFields.email,
      verificationFields.otp,
    );
    return verifiedUser;
  }

  @Mutation(() => Response)
  async login(@Args('loginInput') loginInput: LoginInput): Promise<Response> {
    const { email, password } = loginInput;
    return this.userService.login(email, password);
  }

  @Mutation(() => LoginResponse)
  async verifyLogin(
    @Args('verifyLoginInput') verifyLoginInput: VerifyLoginInput,
  ): Promise<LoginResponse> {
    const { email, otp } = verifyLoginInput;
    return this.userService.verifyLogin(email, otp);
  }

  @Mutation(() => Response)
  async forgetPassword(
    @Args('userEmail') userEmail: string,
  ): Promise<Response> {
    return this.userService.forgetPassword(userEmail);
  }

  @Mutation(() => VerificationResponse)
  async verifyPasswordForget(
    @Args('verificationFields') verificationFields: VerificationFields,
  ): Promise<VerificationResponse> {
    const { email, otp } = verificationFields;
    return await this.userService.verifyPasswordReset(email, otp);
  }
  @Mutation(() => Response)
  async replaceForgotPassword(
    @Args('newPasswordInput') newPasswordInput: NewPasswordInput,
  ): Promise<Response> {
    return await this.userService.replaceForgotPassword(newPasswordInput);
  }

  @Mutation(() => Response)
  async resendVerificationOtp(
    @Args('email') email: string,
  ): Promise<Response> {
    return this.userService.resendVerificationOtp(email);
  }
}
