import React from 'react'
import {
  ApolloHooksProvider,
  useApolloQuery,
  getAllTodos,
  useApolloMutation,
  createTodo,
} from './queries'
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
  const mutate = useApolloMutation(createTodo())
  const [result] = useApolloQuery(getAllTodos())
  if (!result) return null

  function onSubmit(text: string) {
    mutate({
      variables: {
        todoItem: {
          title: text,
          description: null,
          dueDate: null,
        },
      },
      refetchQueries: ['getAllTodos'],
    })
  }

  return <TodoList items={result.data.todoItems} onSubmit={onSubmit} />
}
