import { TypeIR } from '../types'

export function formatType(type: TypeIR): string {
  const leftSide = 'export type ' + typeName(type)
  const fragments = type.fragments ? type.fragments.join(' & ') + ' & ' : ''

  let rightSide = 'unknown'
  if (type.scalar) {
    rightSide = type.scalar
  }
  if (type.fields) {
    rightSide = formatInterface(type.fields)
  }

  let output = leftSide + ' = ' + fragments + rightSide

  if (type.fields) {
    output += type.fields.map(formatType).join('\n')
  }

  return output
}

function typeName(type: TypeIR): string {
  return [...type.namespace, type.name].join('_')
}

export function formatInterface(fields: TypeIR[]) {
  return '{' + fields.map(formatField).join('\n') + '}\n'
}

function formatField(field: TypeIR) {
  let type = typeName(field)
  let optional = false
  if (field.modifiers) {
    optional = field.modifiers[0] == 'Nullable'
    for (const modifier of field.modifiers.reverse()) {
      type = modifier + '<' + type + '>'
    }
  }
  return field.name + (optional ? '?: ' : ': ') + type
}
