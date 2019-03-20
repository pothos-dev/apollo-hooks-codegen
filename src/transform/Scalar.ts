import { GraphQLScalarType } from 'graphql'
import { Config } from './Globals'

export function transformScalarType(type: GraphQLScalarType) {
  switch (type.name) {
    case 'String':
      return 'string'
    case 'Int':
      return 'number'
    case 'Float':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'ID':
      return Config().idType || 'string'
    default:
      return getCustomScalarName(type.name)
  }
}

export function getCustomScalarName(schemaName: string): string {
  const { scalarTypes } = Config()
  const customName = scalarTypes && scalarTypes[schemaName]
  return customName || 'any'
}
