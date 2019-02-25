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

  const queryResult = useQueryWithSubscription(
    getAllTodos(),
    subscribeTodos(),
    (queryData, sub) => {
      const newTodoItem = sub.subscribeTodoItems
      return {
        todoItems: [...queryData.todoItems, newTodoItem],
      }
    }
  )

  if (!queryResult.data) return null
  const todoItems = queryResult.data.todoItems

  function onSubmit(text: string) {
    mutate({
      variables: {
        todoItem: { title: text },
      },
    })
  }

  return <TodoList items={todoItems} onSubmit={onSubmit} />
}
