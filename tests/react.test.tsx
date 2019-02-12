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

function TestApp(props: { resolveLoading(): void }) {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <TestComponent resolveLoading={props.resolveLoading} />
    </ApolloHooksProvider>
  )
}

function TestComponent(props: { resolveLoading(): void }) {
  const [data, error] = useApolloQuery(fetchProducts())

  if (error) throw error
  if (!data) return <div>Loading</div>

  props.resolveLoading()

  return <div>{data.allProducts.length}</div>
}

test('react test', async () => {
  let resolveLoading
  const promise = new Promise(resolve => (resolveLoading = resolve))
  const wrapper = enzyme.mount(<TestApp resolveLoading={resolveLoading} />)
  expect(wrapper.html()).toBe('<div>Loading</div>')
  await promise
  expect(wrapper.html()).toBe('<div>Loading</div>')
})
