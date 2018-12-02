This is a plugin for [graphql-code-generator](https://github.com/dotansimha/graphql-code-generator) that generates fully typed React Hooks from queries, mutations and subscriptions in `.graphql` files.

## Example

Given this query within a .graphql file.
~~~graphql
query fetchRepositoryInfo($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    issues(first: 0) {
      edges {
        node {
          id
          title
          state
        }
      }
    }
  }
}
~~~

it will generate a .ts file which contains some Boilerplate code together with strongly typed functions named after the graphql operations:

~~~typescript
export const fetchRepositoryInfo = defineQuery<
  {
    /* variables */
    owner: string
    name: string
  },
  {
    /* data */
    repository?: null | {
      description?: null | string
      issues: {
        edges?: null | Array<null | {
          node?: null | {
            id: string
            state: 'OPEN' | 'CLOSED'
          }
        }>
      }
    }
  }
>(gql`
  query fetchRepositoryInfo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      description
      issues(first: 0) {
        edges {
          node {
            id
            title
            state
          }
        }
      }
    }
  }
`)
~~~

which can then be used within a functional React Component using the `useApollo[Query|WatchQuery|Mutation]` hooks:

~~~typescript
import { useApolloWatchQuery, fetchRepositoryInfo } from './generated/apollo-hooks'

function RepositoryIssueStates(props: { owner: string, name: string }) {
  // useApolloWatchQuery automatically re-renders this component when the data changes,
  // e.g. due to a mutation
  const [data, error] = useApolloWatchQuery(fetchRepositoryInfo({variables: {owner, name}))
    
  if (!data) return <LoadingIndicator/>
  if (error) return <DataFetchingErrorDisplay error={error}/>
  
  if (!data.repository) {
    return (
       <Card
        title={props.name}
        description={'This repository does not exist :('}
      />
    )
  }
  
  return (
    <Card
      title={data.repository.name}
      description={data.repository.description}
    >
      <IssuesList issues={data.repository.issues}/>
    </Card>
  )
}

~~~




## Usage

## Todo
- Exception handling
- Default values
- Input Enum Types
- Tests!

