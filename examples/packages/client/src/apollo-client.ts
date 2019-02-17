import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:8088/graphql' }),
  cache: new InMemoryCache(),
})
