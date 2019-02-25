import React, { useRef, useState } from 'react'
import {
  ApolloHooksProvider,
  useQuery,
  getAllTodos,
  useMutation,
  createTodo,
  useSubscription,
  subscribeTodos,
  useQueryWithSubscription,
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
  const mutate = useMutation(createTodo())

  const todoItems = useQueryWithSubscription(
    getAllTodos(),
    subscribeTodos(),
    queryData => queryData.todoItems,
    (todoItems, e) => [...todoItems, e.subscribeTodoItems]
  )
  if (!todoItems) return null

  function onSubmit(text: string) {
    mutate({
      variables: {
        todoItem: { title: text },
      },
    })
  }

  return <TodoList items={todoItems} onSubmit={onSubmit} />
}
