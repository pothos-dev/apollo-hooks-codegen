This is a plugin for [graphql-code-generator](https://github.com/dotansimha/graphql-code-generator) that generates fully typed React Hooks from queries, mutations and subscriptions in `.graphql` files.

## Getting started

### Installation

`npm i -D graphql-code-generator apollo-hooks-codegen`

### Writing Queries

Unless traditional Apollo usage, we're actually writing all our queries, mutations and subscriptions inside a dedicated .graphql file:

```graphql
# /src/graphql/todos.graphql
fragment TodoParts on TodoItem {
  id
  title
  isDone
}

query getAllTodos {
  todoItems {
    ...TodoParts
  }
}

subscription subscribeTodos {
  newTodoItem: subscribeTodoItems {
    ...TodoParts
  }
}

mutation createTodo($todoItem: TodoItemInput!) {
  createTodoItem(todoItem: $todoItem) {
    id
  }
}
```

### Setting up codegen

The graphql-code-generator is best configured via a [codegen.yml file](https://graphql-code-generator.com/docs/getting-started/codegen-config).

Here we tell the generator to create a _./src/graphql/index.ts_ file using apollo-hooks-codegen.

```yml
# codegen.yml
schema: http://localhost:4000
documents: ./src/graphql/*.graphql
overwrite: true
generates:
  ./src/graphql/index.ts:
    - apollo-hooks-codegen
```

After creating the file, we just run:
`npx gql-gen`

### Configuring ApolloClient

The hooks need access to an instance of [ApolloClient](https://www.apollographql.com/docs/react/api/apollo-client.html). If you previously used Apollo, you probably already have this set up, otherwise, refer to the [Get started](https://www.apollographql.com/docs/react/essentials/get-started.html) guide.

The code generator created an ApolloHooksProvider, which we have to set up at the root of our app:

```tsx
import { ApolloHooksProvider } from './src/graphql'

const apolloClient = new ApolloClient({
  /* ApolloClient configuration here */
})

function AppWithApollo() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <App />
    </ApolloHooksProvider>
  )
}
```

After all of this is done, we can now start using the generated hooks.

## Usage

Every document (`query`, `mutation`, `subscription` or `fragment`) in the .graphql file generated a Typescript function of the same name.

Each function takes an optional argument, which contains additional options. The configured document is then passed to one of the provided hooks:

### Queries

useQuery uses [watchQuery](https://www.apollographql.com/docs/react/api/apollo-client.html#ApolloClient.watchQuery) under the hood, so the component will re-render automatically if the queried data changes in Apollo's cache for any reason.

```tsx
import { useQuery, getAllTodos } from './src/graphql'

function TodoList() {
  const queryResult = useQuery(getAllTodos({ fetchPolicy: 'cache-first' }))

  // get access to loading and error state of the query
  if (queryResult.loading) return <p>Loading...</p>
  if (queryResult.error) return <p>Error</p>

  // data is null during loading and in case of error, but can be expected to be non-null otherwise
  const todoItems = queryResult.data!.todoItems

  // the compiler knows about which fields are available on todoItems
  return (
    <ul>
      {todoItems.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  )
}
```

### Mutations

useMutation creates a function which executes the configured mutation and returns the result as a Promise.

```tsx
import { useMutation, createTodo } from './src/graphql'

function AddTodoButton() {
  const mutate = useMutation(
    createTodo({
      // options can be passed directly during configuration, like with useQuery.
      // alternatively, you can pass the options object later when calling the mutate function
      variables: {
        todoItem: { title: 'Finish this button component...' },
      },
    })
  )

  return (
    <button
      onClick={() => {
        mutate().then(console.log)
      }}
    >
      Click me!
    </button>
  )
}
```

### Subscriptions

Subscriptions require additional work when setting up ApolloClient, see [here](https://www.apollographql.com/docs/react/advanced/subscriptions.html#subscriptions-client).

```tsx
import { useSubscription, subscribeTodos } from './src/graphql'

function TodoItemTicker() {
  const sub = useSubscription(subscribeTodos())

  // If we did not receive a subscription event yet, the value is null
  if (sub == null) return null

  return <p>Latest Todo: {sub.newTodoItem.title}</p>
}
```

Often, you want to send a query to get some data, and create a subscription to be called back whenever the data changes on server. You can use this helper function to do both in one:

```tsx
import { useQuery, getAllTodos } from './src/graphql'

function TodoList() {
  const queryResult = useQueryWithSubscription(
    getAllTodos(), // the initial query
    subscribeTodos(), // the subscription
    (queryData, subData) => ({
      // Update the query data here with the latest data from the subscription
      todoItems: [...queryData.todoItems, subData.newTodoItem],
    })
  )

  // loading and error state are taken only from the query
  if (queryResult.loading) return <p>Loading...</p>
  if (queryResult.error) return <p>Error</p>

  const todoItems = queryResult.data!.todoItems

  return (
    <ul>
      {todoItems.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  )
}
```

## Types

A key feature of GraphQL is the possibility to fetch as many or as few properties of an object as is needed for a particular view. For this reason, it is difficult to assume a specific interface for any GraphQL type.

This library generates named interfaces for every selection of fields in a query. For example, given the above mutation:

```graphql
mutation createTodo($todoItem: TodoItemInput!) {
  createTodoItem(todoItem: $todoItem) {
    id
  }
}
```

the following types are generated:

```ts
// TodoItemInput
type TodoItemInput = {
  title: TodoItemInput_title
  description?: Nullable<TodoItemInput_description>
  dueDate?: Nullable<TodoItemInput_dueDate>
}
type TodoItemInput_title = string
type TodoItemInput_description = string
type TodoItemInput_dueDate = any

// createTodo() mutation
type createTodo_variables = {
  todoItem: createTodo_variables_todoItem
}
type createTodo_variables_todoItem = TodoItemInput
type createTodo_data = {
  createTodoItem: createTodo_data_createTodoItem
}
type createTodo_data_createTodoItem = { id: createTodo_data_createTodoItem_id }
type createTodo_data_createTodoItem_id = string
```

So it is easy to specify the type of the variables or result (data) of a query or mutation, or any subselection of those.

If you want to re-use a type, I suggest to use named fragments, which create types of the same name as the fragment:

```graphql
fragment TodoParts on TodoItem {
  id
  title
  isDone
}
```

produces:

```ts
type TodoParts = {
  id: TodoParts_id
  title: TodoParts_title
  isDone: TodoParts_isDone
}
type TodoParts_id = string
type TodoParts_title = string
type TodoParts_isDone = boolean
```

## Generator Options

You can specify some options in the codegen.yml:

```yml
schema: http://localhost:4000
documents: ./src/graphql/*.graphql
overwrite: true
generates:
  ./src/graphql/index.ts:
    - apollo-hooks-codegen
      # Options here:
      idType: any  # The Typescript type generated for GraphQL's "ID" type (defaults to string)
      scalarTypes: # The Typescript types generated for custom scalar types in the GraphQL schema (defaults to any)
        JSON: string
        UTCDate: unknown

```

## Future Work

- Suspense support
- Default values
