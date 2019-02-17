import 'reflect-metadata'
import { GraphQLServer } from 'graphql-yoga'
import { buildSchema } from 'type-graphql'
import { TodoItemResolver } from './TodoItemResolver'

startServer()
export async function startServer() {
  const schema = await buildSchema({
    resolvers: [TodoItemResolver],
  })

  const server = new GraphQLServer({ schema })
  server.start(() => console.log('Server is running on localhost:4000'))
}
