import {
  PluginFunction,
  DocumentFile,
  GraphQLSchema,
  DocumentNode,
} from 'graphql-codegen-core'
import {
  DefinitionNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  SelectionSetNode,
  isListType,
  SelectionNode,
  FieldNode,
  GraphQLObjectType,
  OperationTypeNode,
  GraphQLOutputType,
  isNonNullType,
  isScalarType,
  GraphQLScalarType,
  isObjectType,
  Location,
  TypeNode,
  NamedTypeNode,
  ListTypeNode,
  GraphQLList,
} from 'graphql'

export interface PluginConfig {}

export function plugin(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
) {
  schema.getQueryType()

  return join(
    disclaimer,
    imports,
    '',
    ...documents.map(documentFile => formatDocumentFile(documentFile, schema)),
    '',
    boilerplate
  )
}

function formatDocumentFile(file: DocumentFile, schema: GraphQLSchema) {
  return join(
    '',
    '',
    '/*',
    ' * Operations from ' + file.filePath,
    ' */',
    '',
    formatDocumentNode(file.content, schema)
  )
}

function formatDocumentNode(node: DocumentNode, schema: GraphQLSchema) {
  return node.definitions
    .map(definitionNode => formatDefinition(definitionNode, schema))
    .join('\n')
}

function formatDefinition(node: DefinitionNode, schema: GraphQLSchema) {
  switch (node.kind) {
    case 'OperationDefinition':
      return formatOperationDefinition(node, schema)
    default:
      throw 'unhandled DefinitionNode.kind = ' + node.kind
  }
}

function formatOperationDefinition(
  node: OperationDefinitionNode,
  schema: GraphQLSchema
) {
  return (
    'export const ' +
    node.name.value +
    ' = ' +
    node.operation +
    'Factory' +
    '<' +
    formatVariableDefinitions(node.variableDefinitions) +
    ',' +
    formatSelectionSet(
      node.selectionSet,
      selectSchemaObject(schema, node.operation)
    ) +
    '>(gql`\n' +
    indent(formatLoc(node.loc), '  ') +
    '\n`)'
  )
}

function formatLoc(loc: Location) {
  return loc.source.body.substring(loc.start, loc.end)
}

function formatVariableDefinitions(
  nodes: ReadonlyArray<VariableDefinitionNode>
) {
  const list = nodes.map(formatVariableDefinition)
  return join('{', '  /* variables */', ...list, '}')
}

function formatVariableDefinition(node: VariableDefinitionNode) {
  // todo defaultValue

  const isRequired = node.type.kind == 'NonNullType'
  const questionMark = isRequired ? '' : '?'

  return (
    node.variable.name.value + questionMark + ': ' + formatTypeNode(node.type)
  )
}

function formatTypeNode(node: TypeNode): string {
  if (node.kind == 'NonNullType') {
    return formatTypeNodeNotNull(node.type)
  }
  return 'null | ' + formatTypeNodeNotNull(node)
}

function formatTypeNodeNotNull(node: NamedTypeNode | ListTypeNode) {
  switch (node.kind) {
    case 'ListType':
      return 'Array<' + formatTypeNode(node.type) + '>'
    case 'NamedType':
      return formatNameTypeNode(node)
  }
}

function formatNameTypeNode(node: NamedTypeNode) {
  switch (node.name.value) {
    case 'String':
      return 'string'
    case 'Int':
      return 'number'
    case 'Float':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'ID':
      return 'string'
    default:
      throw 'unhandled NamedTypeNode ' + node.name.value
  }
}

function formatSelectionSet(
  node: SelectionSetNode,
  schemaObject: GraphQLObjectType
) {
  const list = node.selections.map(selectionNode =>
    formatSelectionNode(selectionNode, schemaObject, '  ')
  )
  return join('{', '  /* data */', ...list, '}')
}

function formatSelectionNode(
  node: SelectionNode,
  schemaObject: GraphQLObjectType,
  offset: string
) {
  switch (node.kind) {
    case 'Field':
      return formatFieldNode(node, schemaObject, offset)
    default:
      throw 'unhandled SelectionNode.kind = ' + node.kind
  }
}

function formatFieldNode(
  node: FieldNode,
  schemaObject: GraphQLObjectType,
  offset: string
) {
  const schemaName = node.name.value
  const aliasName = node.alias ? node.alias.value : schemaName

  const schemaField = schemaObject.getFields()[schemaName]
  const isRequired = isNonNullType(schemaField.type)
  const questionMark = isRequired ? '' : '?'

  return (
    offset +
    aliasName +
    questionMark +
    ': ' +
    formatGraphQLOutputType(schemaField.type, node.selectionSet, offset + '  ')
  )
}

function formatGraphQLOutputType(
  type: GraphQLOutputType,
  selectionSet: SelectionSetNode,
  offset: string
): string {
  if (isNonNullType(type)) {
    return formatGraphQLOutputTypeNotNull(type.ofType, selectionSet, offset)
  }
  return 'null | ' + formatGraphQLOutputTypeNotNull(type, selectionSet, offset)
}

function formatGraphQLOutputTypeNotNull(
  type: GraphQLOutputType,
  selectionSet: SelectionSetNode,
  offset: string
) {
  if (isScalarType(type)) {
    return formatGraphQLScalarType(type)
  }
  if (isObjectType(type)) {
    return formatGraphQLObjectType(type, selectionSet, offset)
  }
  if (isListType(type)) {
    return (
      'Array<' +
      formatGraphQLOutputType(type.ofType, selectionSet, offset) +
      '>'
    )
  }
  throw 'unhandled GraphQLOutputType "' + type + '"'
}

function formatGraphQLScalarType(type: GraphQLScalarType) {
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
      return 'string'
    default:
      throw 'unhandled GraphQLScalarType ' + type
  }
}

function formatGraphQLObjectType(
  type: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  offset: string
) {
  const list = selectionSet.selections.map(selectionNode =>
    formatSelectionNode(selectionNode, type, offset)
  )
  return join('{', ...list, '}')
}

function selectSchemaObject(
  schema: GraphQLSchema,
  operation: OperationTypeNode
) {
  switch (operation) {
    case 'query':
      return schema.getQueryType()
    case 'mutation':
      return schema.getMutationType()
    case 'subscription':
      return schema.getSubscriptionType()
  }
}

const disclaimer = `
/*
 * This file was generated by graphql-code-generator with the apollo-hooks-codegen plugin.
 * Any changes made to the file will be overwritten.
 */
`

const imports = `
import ApolloClient, {
  MutationOptions,
  ObservableQuery,
  WatchQueryOptions,
} from 'apollo-client'
import { createContext, useEffect, useState, useContext } from 'react'
import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
`

const boilerplate = `
/*
 * Boilerplate
 */

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

const apolloContext = createContext<{ apolloClient?: ApolloClient<any> }>({})

export function useApolloWatchQuery<Data, Variables>(
  queryFactory: (
    apolloClient: ApolloClient<any>
  ) => ObservableQuery<Data, Variables>
): Data | undefined {
  const { apolloClient } = useContext(apolloContext)
  const [state, setState] = useState<Data | undefined>(undefined)
  useEffect(() => {
    const watchQuery = queryFactory(apolloClient)
    const subscription = watchQuery.subscribe(result => setState(result.data))
    return () => subscription.unsubscribe()
  }, [])
  return state
}

// export function useApolloMutation<Data, Variables>(
//   mutationFactory: (
//     apolloClient: ApolloClient<any>
//     ) => ObservableQuery<Data, Variables>
// )

function queryFactory<Variables, Data>(doc: DocumentNode) {
  return function(options: Omit<WatchQueryOptions<Variables>, 'query'> = {}) {
    return function(apolloClient: ApolloClient<any>) {
      return apolloClient.watchQuery<Data>({ query: doc, ...options })
    }
  }
}

// function mutationFactory<Variables, Data>(mutation: DocumentNode) {
//   return function(
//     options: Omit<MutationOptions<Data, Variables>, 'mutation'> = {}
//   ) {
//     return async function(apolloClient: ApolloClient<any>) {
//       const result = await apolloClient.mutate<Data>({ mutation, ...options })
//       return result.data as Data
//     }
//   }
// }

`

function join(...lines: string[]) {
  return lines.join('\n')
}

function indent(multilineText: string, offset: string) {
  return multilineText
    .trim()
    .split('\n')
    .map(line => offset + line)
    .join('\n')
}
