import { TypeIR } from '../types'
import { typeName } from './Type'

export function formatInterfaceType(type: TypeIR) {
  return (
    formatFragments(type.fragments) +
    '{\n' +
    (type.typename ? `__typename?: '${type.typename}'\n` : '') +
    type.fields!.map(formatField).join('') +
    '}\n'
  )
}

function formatFragments(fragments: TypeIR['fragments']) {
  if (!fragments || fragments.length == 0) return ''
  return fragments.join('&') + '&'
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
