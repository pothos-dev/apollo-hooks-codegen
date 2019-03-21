import { FragmentIR } from '../types'
import { formatFields } from './Interface'
import { formatType } from './Type'

export function formatFragment(fragmentType: FragmentIR): string {
  const { name, fields, gqlExpression } = fragmentType
  let output = `export type ${name} = ${formatFields(fields)}\n`
  for (const field of fragmentType.fields) {
    output += formatType(field)
  }
  output += `const _gql_${name} = gql\`${gqlExpression}\`\n`
  return output
}
