import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { graphqlConfig } from 'src/configs/graphql.config';

@Module({
  imports: [GraphQLModule.forRoot(graphqlConfig)],
})
export class GqlModule {}
