import 'jsdom-global/register'
import React from 'react'
import enzyme from 'enzyme'
import EnzymeAdapter from 'enzyme-adapter-react-16'
import {
  ApolloHooksProvider,
  useApolloQuery,
  fetchProducts,
} from './resources/fakerql-output'
import ApolloClient from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'unfetch'

enzyme.configure({ adapter: new EnzymeAdapter() })

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://fakerql.com/graphql',
    credentials: 'include',
    fetch,
  }),
  cache: new InMemoryCache(),
})

function TestComponent() {
  const [data, error] = useApolloQuery(fetchProducts())

  if (error) throw error
  if (!data) return <div>Loading</div>

  return <div>{data.allProducts.length}</div>
}

function TestApp() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <TestComponent />
    </ApolloHooksProvider>
  )
}

test('react test', () => {
  const wrapper = enzyme.mount(<TestApp />)
  expect(wrapper.html()).toBe('<div>Hello world</div>')
})
