import { TypeIR } from '../types'
import { typeName } from './Type'

export function formatInterfaceType(type: TypeIR) {
  return formatFragments(type.fragments) + formatFields(type.fields)
}

export function formatFields(fields?: TypeIR[]) {
  if (!fields) return ''
  return '{' + fields.map(formatField) + '}\n'
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
  return field.name + (optional ? '?: ' : ': ') + type + '\n'
}

function formatFragments(fragments: TypeIR['fragments']) {
  if (!fragments) return ''
  return fragments.join('&') + '&'
}
