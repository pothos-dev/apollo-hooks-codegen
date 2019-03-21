import { TypeIR } from '../types'

export function formatUnionType(type: TypeIR) {
  return type.union!.map(t => [...t.namespace, t.name].join('_')).join(' | ')
}
