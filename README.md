This is a plugin for [graphql-code-generator](https://github.com/dotansimha/graphql-code-generator) that generates fully typed React Hooks from queries, mutations and subscriptions in `.graphql` files.

## Getting started

This library generates React Hooks, as such it requires React version 16.7 to be used, which is currently in beta.

`npm i react:16.7.0-alpha.2 react-dom:16.7.0-alpha.2`

It also uses [apollo-client](https://github.com/apollographql/apollo-client) under the hood, so we have to install it and its dependencies.

`npm i apollo-client graphql`

Note that we are not using [react-apollo](https://github.com/apollographql/react-apollo), the usual React integration for apollo. You can use it in addition to this library, if you want, but you may not need it.

In the general case, you want to also want to install these additional libraries to set up your ApolloClient, unless you opt to use [Apollo Boost](https://www.apollographql.com/docs/react/advanced/boost-migration.html):

`npm i apollo-cache-inmemory apollo-link-http`

For the actual code generation, we now install these devDependencies:

`npm i -D graphql-code-generator apollo-hooks-codegen`

Now we can start writing GraphQL code. For this example, I'm using the [fakerql.com](https://fakerql.com/) schema:

```graphql
# /src/example.gql
mutation login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
  }
}

query fetchProducts {
  allProducts(count: 25) {
    id
    name
    price
  }
}
```

Now we invoke the code generator, which we can do [in a number of different ways](https://graphql-code-generator.com/docs/getting-started/codegen-config). I suggest writing a config file and invoking `gql-gen` from an npm script.

```yml
# /codegen.yml
schema: https://fakerql.com/graphql
documents: src/graphql.gql
overwrite: true
generates:
  src/graphql.generated.ts:
    - apollo-hooks-codegen
```

```json5
{
  // package.json
  scripts: {
    codegen: 'gql-gen',
    'codegen:watch': 'nodemon -w *.gql -x npm run codegen',
  },
}
```

We're now ready to set up our ApolloClient.

```typescript
const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://fakerql.com/graphql',
    credentials: 'include',
  }),
  cache: new InMemoryCache(),
})
```

We also need to add an ApolloHooksProvider somewhere at the root of our component tree to pass the ApolloClient to the components that will be using our hooks.

```tsx
import { ApolloHooksProvider } from './graphql.generated.ts'

function App() {
  return (
    <ApolloHooksProvider apolloClient={apolloClient}>
      <Router /> {/* or something like that */}
    </ApolloHooksProvider>
  )
}
```

Now we're ready to use the hooks that we've already generated.

```tsx
import { useApolloQuery, fetchProducts } from './graphql.generated.ts'

function ProductListScreen() {
  // This hook will automatically re-render this component when new data is available,
  // which may happen after the initial load, when we use a refetchQuery or
  // when we update the Apollo cache through some other means.
  const [data, error] = useApolloQuery(fetchProducts())

  if (error) throw 'Deal with it.'
  if (!data) return <LoadingIndicator />

  // Look ma, typesafe queries!
  return (
    <ul>
      <li key={product.id}>
        {product.name} for {product.price}
      </li>
    </ul>
  )
}
```

Each operation we defined in our .gql file corresponds to a function in the generated Typescript file. So it is important to give a proper name to every operation.  
You may pass an object with additional options ([queries](https://www.apollographql.com/docs/react/api/apollo-client.html#ApolloClient.watchQuery), [mutations](https://www.apollographql.com/docs/react/api/apollo-client.html#ApolloClient.mutate)) to the function, like in this example:

```tsx
import { useApolloMutation, login } from './graphql.generated.ts'

function LoginButton() {
  const mutate = useApolloMutation(
    login({
      // define options here
      refetchQueries: ['fetchAuthenticatedUser'],
    })
  )

  async function onClick() {
    // For mutations, you may also specify options when executing the mutate function.
    // They will be merged with the options from above.
    const result = await mutate({
      variables: { email: 'steve.jobs@apple.com', password: 'hunter2' },
    })
    if (!result.login) {
      console.log('Wrong password!')
    } else {
      console.log(result.login.token)
    }
  }

  return <button onClick={onClick}>let me in</button>
}
```

## Todos

- Subscriptions
- Default values
- Input Enum Types
- Better Tests
