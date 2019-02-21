import React, { useRef } from 'react'
import {
  ApolloHooksProvider,
  useApolloQuery,
  getAllTodos,
  useApolloMutation,
  createTodo,
  useApolloSubscription,
  subscribeTodos,
} from './queries'
import { apolloClient } from './apollo-client'
import { TodoList } from './components/TodoList'
import { TodoItem } from './types'

export default function App() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <MyComponent />
    </ApolloHooksProvider>
  )
}

function MyComponent() {
  const mutate = useApolloMutation(createTodo())
  const todoItems = useTodoItems()
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

function useTodoItems() {
  const todoItems = useRef<TodoItem[] | null>(null)
  const query = useApolloQuery(getAllTodos())
  const subscription = useApolloSubscription(subscribeTodos())

  if (todoItems.current == null && query) {
    todoItems.current = [...query.data.todoItems]
  }

  // if (todoItems.current && subscription) {
  //   todoItems.current.push(subscription.subscribeTodoItems)
  // }

  return todoItems.current
}
