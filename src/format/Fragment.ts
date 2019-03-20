import { FragmentIR } from '../types'
import { formatInterface, formatType } from './Type'

export function formatFragments(fragmentType: FragmentIR): string {
  return [
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
      '`',
  ].join('\n')
}
