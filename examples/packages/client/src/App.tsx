import React, { useRef, useState } from 'react'
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
  const [todoItems, setTodoItems] = useState(null as TodoItem[] | null)
  const query = useApolloQuery(getAllTodos())
  const subscription = useApolloSubscription(subscribeTodos())

  if (todoItems == null && query) {
    setTodoItems([...query.data.todoItems])
  }

  if (todoItems && subscription) {
    setTodoItems([...todoItems, subscription.subscribeTodoItems])
  }

  return todoItems
}
