import { TypeIR } from '../types'

export function formatUnionType(type: TypeIR) {
  return 'unknown'
  return type.union!.map(union => union.name).join(' | ')
}
