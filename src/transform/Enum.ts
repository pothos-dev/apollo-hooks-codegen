import { GraphQLEnumType } from 'graphql'

export function transformEnumType(type: GraphQLEnumType): string {
  return type
    .getValues()
    .map(value => "'" + value.name + "'")
    .join(' | ')
}
