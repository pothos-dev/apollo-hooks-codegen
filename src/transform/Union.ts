import { GraphQLUnionType, SelectionSetNode } from 'graphql'
import { TypeIR } from '../types'
import { transformObject } from './Object'

export function transformUnionType(
  namespace: string[],
  selectionSet: SelectionSetNode,
  unionType: GraphQLUnionType
): TypeIR[] {
  const unionTypesIR: TypeIR[] = []

  for (const selection of selectionSet.selections) {
    if (selection.kind != 'InlineFragment') continue
    if (selection.typeCondition == null) continue
    if (selection.typeCondition.kind != 'NamedType') continue
    const objectTypeName = selection.typeCondition.name.value

    const objectType = unionType.getTypes().find(t => t.name == objectTypeName)!
    const { fields, fragments } = transformObject(
      [...namespace, objectTypeName],
      selection.selectionSet,
      objectType
    )

    unionTypesIR.push({
      typename: objectTypeName,
      name: objectTypeName,
      fields,
      fragments,
      namespace,
    })
  }

  return unionTypesIR
}
