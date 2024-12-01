import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: true,
  sortSchema: false,
  debug: process.env.NODE_ENV !== 'prod',
  playground: process.env.NODE_ENV !== 'prod',
  introspection: process.env.NODE_ENV !== 'prod',
  subscriptions: {
    'graphql-ws': true,
    'subscriptions-transport-ws': true,
  },
};
