import { PluginIR, FileIR, OperationIR, TypeIR, FragmentIR } from './types'
import { disclaimer, imports, boilerplate } from './format/Boilerplate'
import { formatInputTypes } from './format/InputTypes'
import { formatType, formatInterface } from './format/Type'

export function format(plugin: PluginIR): string {
  return join(
    disclaimer,
    imports,
    '',
    formatInputTypes(plugin.inputTypes),
    ...plugin.files.map(formatFile),
    '',
    boilerplate
  )
}

function formatFile(file: FileIR): string {
  return join(
    '',
    '',
    '/*',
    ' * Fragments from ' + file.filePath,
    ' */',
    '',
    ...file.fragments.map(formatFragments),
    '',
    '/*',
    ' * Operations from ' + file.filePath,
    ' */',
    '',
    ...file.operations.map(formatOperation)
  )
}

function formatFragments(fragmentType: FragmentIR): string {
  return join(
    'export type ' +
      fragmentType.name +
      ' = ' +
      formatInterface(fragmentType.fields),
    '',
    ...fragmentType.fields.map(formatType),
    '',
    'const _gql_' +
      fragmentType.name +
      ' = gql`' +
      fragmentType.gqlExpression +
      '`'
  )
}

function formatOperation(operation: OperationIR): string {
  const {
    name,
    operationType,
    gqlExpression,
    data,
    variables,
    fragments,
  } = operation

  let gqlFragments = fragments
    ? join(...fragments.map(it => '${_gql_' + it + '}'))
    : ''
  let gql = 'gql`' + gqlExpression + gqlFragments + '`'

  return join(
    `export const ${name} = ${operationType}<${name}_variables, ${name}_data>(${gql})`,
    formatType(variables),
    formatType(data),
    ``
  )
}

function join(...lines: string[]) {
  return lines.join('\n')
}
