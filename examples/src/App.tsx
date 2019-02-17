import React from 'react'
import { ApolloHooksProvider, useApolloQuery, fetchPersons } from './queries'
import { apolloClient } from './apollo-client'

export default function App() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <MyComponent />
    </ApolloHooksProvider>
  )
}

function MyComponent() {
  const result = useApolloQuery(fetchPersons())

  return <div />
}
