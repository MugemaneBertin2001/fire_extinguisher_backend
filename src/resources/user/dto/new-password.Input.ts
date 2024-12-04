import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class NewPasswordInput {
  @Field()
  newPassword: string;

  @Field()
  confirmPassword: string;

  @Field()
  email: string;

  @Field()
  verificationToken: string;
}
