import { OperationIR } from '../types'
import { formatType } from './Type'

export function formatOperation(operation: OperationIR): string {
  const {
    name,
    operationType,
    gqlExpression,
    data,
    variables,
    fragments,
  } = operation

  let gqlFragments = fragments
    ? fragments.map(it => '${_gql_' + it + '}').join('\n')
    : ''

  let gql = 'gql`' + gqlExpression + gqlFragments + '`'

  return (
    `export const ${name} = ${operationType}<${name}_variables, ${name}_data>(${gql})` +
    '\n' +
    formatType(variables) +
    '\n' +
    formatType(data) +
    '\n'
  )
}
