import React from 'react'
import { ApolloHooksProvider, useApolloQuery, getAllTodos } from './queries'
import { apolloClient } from './apollo-client'
import { TodoList } from './components/TodoList'

export default function App() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <MyComponent />
    </ApolloHooksProvider>
  )
}

function MyComponent() {
  const [result] = useApolloQuery(getAllTodos())
  if (!result) return null

  return <TodoList items={result.data.todoItems} />
}
