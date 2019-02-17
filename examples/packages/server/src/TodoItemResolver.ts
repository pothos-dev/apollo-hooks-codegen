import {
  ObjectType,
  Field,
  ID,
  Resolver,
  Query,
  InputType,
  Mutation,
  Arg,
} from 'type-graphql'

@ObjectType()
class TodoItem {
  @Field(type => ID)
  id!: string

  @Field()
  title!: string

  @Field()
  description?: string

  @Field()
  isDone!: boolean

  @Field()
  dueDate?: Date
}

@InputType()
class TodoItemInput {
  @Field()
  title!: string

  @Field({ nullable: true })
  description?: string

  @Field({ nullable: true })
  dueDate?: Date
}

@Resolver(TodoItem)
export class TodoItemResolver {
  @Query(returns => [TodoItem])
  todoItems() {
    return this.todos
  }

  @Mutation(returns => TodoItem)
  createTodoItem(@Arg('todoItem') input: TodoItemInput) {
    const todoItem: TodoItem = {
      id: (this.todos.length + 1).toString(),
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      isDone: false,
    }

    this.todos.push(todoItem)
    return todoItem
  }

  todos: TodoItem[] = [
    { id: '1', title: 'Learn GraphQL', isDone: true },
    {
      id: '2',
      title: 'Use apollo-hooks-codegen',
      isDone: false,
      dueDate: new Date(),
    },
  ]
}
