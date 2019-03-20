import { OperationDefinitionNode, OperationTypeNode } from 'graphql'
import { OperationIR, TypeIR } from '../types'
import { extractGQLExpression } from './GQL'
import { extractFragments } from './Fragment'
import { transformObject } from './Object'
import { Schema } from './Globals'
import { getVariableType } from './Variable'

export function transformOperationDefinitionNode(
  node: OperationDefinitionNode
): OperationIR {
  const name = node.name!.value
  const operationType = node.operation
  const gqlExpression = extractGQLExpression(node)
  const variables = extractVariables([name], node)
  const data = extractData([name], node)
  const fragments = extractFragments(data)

  return { name, operationType, gqlExpression, data, variables, fragments }
}

function extractVariables(
  namespace: string[],
  node: OperationDefinitionNode
): TypeIR {
  const name = 'variables'
  const fields = node.variableDefinitions!.map(node =>
    getVariableType([...namespace, 'variables'], node)
  )
  return { namespace, name, fields }
}

function extractData(
  namespace: string[],
  node: OperationDefinitionNode
): TypeIR {
  const name = 'data'
  const { fields, fragments } = transformObject(
    [...namespace, 'data'],
    node.selectionSet,
    getSchemaRootObject(node.operation)
  )

  return { namespace, name, fields, fragments }
}

function getSchemaRootObject(operation: OperationTypeNode) {
  switch (operation) {
    case 'query':
      return Schema().getQueryType()!
    case 'mutation':
      return Schema().getMutationType()!
    case 'subscription':
      return Schema().getSubscriptionType()!
  }
}
