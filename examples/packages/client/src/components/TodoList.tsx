import React, { CSSProperties } from 'react'
import { TodoItem } from '../types'

export function TodoList(props: { items: ReadonlyArray<TodoItem> }) {
  return (
    <div style={{ width: 300, border: '1px solid #0001' }}>
      {props.items.map(item => (
        <TodoListItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function TodoListItem(props: { item: TodoItem }) {
  const textDecoration = props.item.isDone ? 'line-through' : undefined
  return (
    <div style={{ display: 'flex', backgroundColor: '#0001', margin: 2 }}>
      <input type="checkbox" checked={props.item.isDone} />
      <div style={{ textDecoration }}>{props.item.title}</div>
    </div>
  )
}
