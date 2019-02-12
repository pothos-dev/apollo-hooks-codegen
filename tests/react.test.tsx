// ! TODO get hooks to work with react-testing-library

// import React from 'react'
// import ApolloClient from 'apollo-client'
// import { HttpLink } from 'apollo-link-http'
// import { InMemoryCache } from 'apollo-cache-inmemory'
// import fetch from 'unfetch'
// import {
//   ApolloHooksProvider,
//   fetchPersons,
//   useApolloQuery,
// } from './generated/graphql-demo-output'
// import { render } from 'react-testing-library'

// // enzyme.configure({ adapter: new EnzymeAdapter() })

// const apolloClient = new ApolloClient({
//   link: new HttpLink({
//     uri: 'http://localhost:8088/graphql',
//     fetch,
//   }),
//   cache: new InMemoryCache(),
// })

// function TestApp(props: { resolveLoading(): void }) {
//   return (
//     <ApolloHooksProvider apolloClient={apolloClient}>
//       <TestComponent resolveLoading={props.resolveLoading} />
//     </ApolloHooksProvider>
//   )
// }

// function TestComponent(props: { resolveLoading(): void }) {
//   const [data, error] = useApolloQuery(fetchPersons())

//   if (error) throw error
//   if (!data) return <div>Loading</div>

//   props.resolveLoading()

//   return <div>{data.persons.length}</div>
// }

// test('react test', async () => {
//   let resolveLoading
//   const wrapper = render(<TestApp resolveLoading={resolveLoading} />)

//   expect(wrapper.container.firstChild).toBe(
//     '{"type":"div","props":{},"children":["Loading"]}'
//   )
//   // await promise
//   // expect(html()).toBe('{"type":"div","props":{},"children":["Loading"]}')
// })
