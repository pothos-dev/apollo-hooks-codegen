import React from 'react'
import { ApolloHooksProvider, useApolloQuery, getAllTodos } from './queries'
import { apolloClient } from './apollo-client'

export default function App() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <MyComponent />
    </ApolloHooksProvider>
  )
}

function MyComponent() {
  const result = useApolloQuery(getAllTodos())

  return <div />
}
