export module getAllTodos {
  export interface variables {}
  export interface data {
    todoItems: ReadonlyArray<data.todoItems>
  }
  export module data {
    export type todoItems = {
      id: todoItems.id
      title: todoItems.title
      isDone: todoItems.isDone
    }
    export module todoItems {
      export type id = string
      export type title = string
      export type isDone = boolean
    }
  }
}
