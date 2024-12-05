import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: true,
  sortSchema: false,
  debug: process.env.NODE_ENV !== 'prod',
  playground: process.env.NODE_ENV !== 'prod',
  introspection: true,
  subscriptions: {
    'graphql-ws': true,
    'subscriptions-transport-ws': true,
  },
};
