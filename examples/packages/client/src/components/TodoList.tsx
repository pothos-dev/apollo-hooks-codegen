import React, { useState } from 'react'
import { TodoItem } from '../types'

export function TodoList(props: {
  items: ReadonlyArray<TodoItem>
  onSubmit(text: string): void
}) {
  const { items, onSubmit } = props

  return (
    <div style={{ width: 300, border: '1px solid #0001' }}>
      <TodoListHeader onSubmit={onSubmit} />
      {items.map(item => (
        <TodoListItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function TodoListHeader(props: { onSubmit(text: string): void }) {
  const { onSubmit } = props

  const [value, setValue] = useState('')

  return (
    <div style={{ display: 'flex', backgroundColor: '#0001', margin: 2 }}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button onClick={() => onSubmit(value)}>Add</button>
    </div>
  )
}

function TodoListItem(props: { item: TodoItem }) {
  const { isDone, title } = props.item

  const textDecoration = isDone ? 'line-through' : undefined

  return (
    <div style={{ display: 'flex', backgroundColor: '#0001', margin: 2 }}>
      <input type="checkbox" checked={isDone} />
      <div style={{ textDecoration }}>{title}</div>
    </div>
  )
}
