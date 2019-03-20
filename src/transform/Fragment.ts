import { TypeIR, FragmentIR } from '../types'
import { FragmentDefinitionNode, GraphQLObjectType } from 'graphql'
import { extractGQLExpression } from './GQL'
import { transformObject } from './Object'
import { Schema } from './Globals'

export function extractFragments(rootType: TypeIR): string[] | undefined {
  let fragmentSet: { [fragment: string]: true } = {}

  recursive(rootType)
  function recursive(type: TypeIR) {
    if (type.fields) {
      for (const field of type.fields) {
        recursive(field)
      }
      if (type.fragments) {
        for (const fragment of type.fragments) {
          fragmentSet[fragment] = true
        }
      }
    }
  }

  let fragments = Object.keys(fragmentSet)
  if (fragments.length == 0) {
    return undefined
  }
  return fragments
}

export function transformFragmentDefinitionNode(
  node: FragmentDefinitionNode
): FragmentIR {
  const name = node.name.value
  const gqlExpression = extractGQLExpression(node)

  const namespace = [name]
  const schemaType = Schema().getType(
    node.typeCondition.name.value
  ) as GraphQLObjectType
  const { fields } = transformObject(namespace, node.selectionSet, schemaType)

  return { name, fields, gqlExpression }
}
