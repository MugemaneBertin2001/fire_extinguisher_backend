import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Response {
  @Field()
  message: string;

  @Field()
  status: number;
}


@ObjectType()
export class VerificationResponse extends Response {
  @Field()
  verificationToken: string;
}