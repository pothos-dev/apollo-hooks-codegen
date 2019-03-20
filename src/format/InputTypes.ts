import { TypeIR } from '../types'
import { formatType } from './Type'

export function formatInputTypes(inputTypes: TypeIR[]): string {
  return (
    `
/*
 * GraphQL Input Types
 */


` + inputTypes.map(formatType).join('\n')
  )
}
