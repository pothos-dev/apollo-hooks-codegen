import 'reflect-metadata'
import { GraphQLServer } from 'graphql-yoga'
import { buildSchema } from 'type-graphql'
import { TodoItemResolver } from './TodoItemResolver'

startServer()
export async function startServer() {
  const schema = await buildSchema({
    resolvers: [TodoItemResolver],
    validate: false,
  })

  const server = new GraphQLServer({ schema })
  server.start({ cors: { origin: true } }, () =>
    console.log('Server is running on localhost:4000')
  )
}
