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
  GraphQLInputObjectType,
  isInputType,
  isInputObjectType,
  GraphQLInputType,
  GraphQLInputField,
  isEnumType,
} from 'graphql'

export interface PluginConfig {}

export function plugin(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
) {
  const inputNames: InputNames = {}

  return join(
    disclaimer,
    imports,
    '',
    ...documents.map(documentFile =>
      formatDocumentFile(documentFile, schema, inputNames)
    ),
    '',
    formatInputNames(schema, inputNames),
    boilerplate
  )
}

function formatInputNames(schema: GraphQLSchema, inputNames: InputNames) {
  findRecursiveInputReferences(schema, inputNames, Object.keys(inputNames))

  if (Object.keys(inputNames).length == 0) return ''

  return join(
    '/*',
    ' * GraphQL InputTypes',
    ' */',
    '',
    ...Object.keys(inputNames).map(name => {
      const node = schema.getType(name) as GraphQLInputObjectType
      return formatGraphQLInputObjectType(node)
    })
  )
}

function findRecursiveInputReferences(
  schema: GraphQLSchema,
  inputNames: InputNames,
  newNames: string[]
) {
  if (newNames.length == 0) return

  const newNames2: string[] = []

  for (const name of newNames) {
    const node = schema.getType(name) as GraphQLInputObjectType
    const fieldMap = node.getFields()
    const fields = Object.values(fieldMap)
    for (const field of fields) {
      handleInputType(field.type)
    }
  }

  findRecursiveInputReferences(schema, inputNames, newNames2)

  function handleInputType(node: GraphQLInputType) {
    if (isNonNullType(node)) {
      handleInputType(node.ofType)
      return
    }
    if (isListType(node)) {
      handleInputType(node.ofType)
      return
    }
    if (isInputObjectType(node)) {
      if (!inputNames[node.name]) {
        inputNames[node.name] = true
        newNames2.push(node.name)
      }
      return
    }
  }
}

function formatGraphQLInputObjectType(node: GraphQLInputObjectType) {
  const fieldMap = node.getFields()
  const fields = Object.values(fieldMap)
  return join(
    'interface ' + node.name + '{',
    ...fields.map(field => formatInputField(field)),
    '}\n'
  )
}

function formatInputField(field: GraphQLInputField) {
  const isRequired = isNonNullType(field.type)
  const questionMark = isRequired ? '' : '?'
  return field.name + questionMark + ': ' + formatInputType(field.type)
}

function formatInputType(node: GraphQLInputType) {
  if (isNonNullType(node)) {
    return node.ofType
  }
  if (isListType(node)) {
    return 'ReadonlyArray<' + node.ofType + '>'
  }
  if (isEnumType(node)) {
    // ! TODO
    throw 'Unhandled GraphQLEnumType in formatInputType'
  }
  if (isScalarType(node)) {
    return formatGraphQLScalarType(node)
  }
  if (isInputObjectType(node)) {
    return node.name
  }
  throw 'Unhandled GraphQLInputType'
}

function formatDocumentFile(
  file: DocumentFile,
  schema: GraphQLSchema,
  inputNames: InputNames
) {
  return join(
    '',
    '',
    '/*',
    ' * Operations from ' + file.filePath,
    ' */',
    '',
    formatDocumentNode(file.content, schema, inputNames)
  )
}

function formatDocumentNode(
  node: DocumentNode,
  schema: GraphQLSchema,
  inputNames: InputNames
) {
  return node.definitions
    .map(definitionNode => formatDefinition(definitionNode, schema, inputNames))
    .join('\n')
}

function formatDefinition(
  node: DefinitionNode,
  schema: GraphQLSchema,
  inputNames: InputNames
) {
  switch (node.kind) {
    case 'OperationDefinition':
      return formatOperationDefinition(node, schema, inputNames)
    default:
      throw 'unhandled DefinitionNode.kind = ' + node.kind
  }
}

function formatOperationDefinition(
  node: OperationDefinitionNode,
  schema: GraphQLSchema,
  inputNames: InputNames
) {
  return (
    'export const ' +
    node.name.value +
    ' = ' +
    definerFunction(node.operation) +
    '<' +
    formatVariableDefinitions(node.variableDefinitions, inputNames) +
    ',' +
    formatSelectionSet(
      node.selectionSet,
      selectSchemaObject(schema, node.operation)
    ) +
    '>(gql`\n' +
    indent(formatLoc(node.loc), '  ') +
    '\n`)\n'
  )

  function definerFunction(operation: OperationTypeNode) {
    switch (operation) {
      case 'query':
        return 'defineQuery'
      case 'mutation':
        return 'defineMutation'
      case 'subscription':
        throw 'TODO'
    }
  }
}

function formatLoc(loc: Location) {
  return loc.source.body.substring(loc.start, loc.end)
}

function formatVariableDefinitions(
  nodes: ReadonlyArray<VariableDefinitionNode>,
  inputNames: InputNames
) {
  const list = nodes.map(variableNode =>
    formatVariableDefinition(variableNode, inputNames)
  )
  return join('{', '  /* variables */', ...list, '}')
}

function formatVariableDefinition(
  node: VariableDefinitionNode,
  inputNames: InputNames
) {
  // todo defaultValue

  const isRequired = node.type.kind == 'NonNullType'
  const questionMark = isRequired ? '' : '?'

  return (
    node.variable.name.value +
    questionMark +
    ': ' +
    formatTypeNode(node.type, inputNames)
  )
}

function formatTypeNode(node: TypeNode, inputNames: InputNames): string {
  if (node.kind == 'NonNullType') {
    return formatTypeNodeNotNull(node.type, inputNames)
  }
  return 'null | ' + formatTypeNodeNotNull(node, inputNames)
}

function formatTypeNodeNotNull(
  node: NamedTypeNode | ListTypeNode,
  inputNames: InputNames
) {
  switch (node.kind) {
    case 'ListType':
      return 'Array<' + formatTypeNode(node.type, inputNames) + '>'
    case 'NamedType':
      return formatNameTypeNode(node, inputNames)
  }
}

function formatNameTypeNode(node: NamedTypeNode, inputNames: InputNames) {
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
      inputNames[node.name.value] = true
      return node.name.value
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
  if (isEnumType(type)) {
    const enumValues = type.getValues()
    return enumValues.map(value => "'" + value.name + "'").join(' | ')
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
import React from 'react'
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
type Error = any
type QueryOpts<V> = Omit<WatchQueryOptions<V>, 'query'>
type MutateOpts<D, V> = Omit<MutationOptions<D, V>, 'mutation'>

// We grab the ApolloClient from this context within our hooks
type ContextType = { apolloClient?: ApolloClient<any> }
const apolloContext = createContext<ContextType>({})

// Must be inserted at the root of all components that want to use the hook
// functions supplied by this file.
export function ApolloHooksProvider({
  children,
  apolloClient,
}: {
  children: React.ReactNode
  apolloClient?: ApolloClient<any> | undefined
}) {
  const elementType = apolloContext.Provider
  const elementProps: React.ProviderProps<ContextType> = {
    value: { apolloClient },
  }
  const Provider = apolloContext.Provider
  return React.createElement(elementType, elementProps, children)
}

// Converts a gql-snippet into a user-callable function that takes options,
// which can then be passed to useApolloWatchQuery to execute the query.
function defineQuery<V, D>(doc: DocumentNode) {
  return function configureQuery(opts: QueryOpts<V> = {}) {
    return function executeQuery(client: ApolloClient<any>) {
      return client.watchQuery<D>({ query: doc, ...opts })
    }
  }
}

// Executes a query that has been created by calling the exported function with
// the same name as the query operation.
// The React Hooks rules apply - this function must be called unconditionally
// within a functional React Component and will rerender the component whenever
// the query result changes.
export function useApolloWatchQuery<D, V>(
  configuredQuery: (client: ApolloClient<any>) => ObservableQuery<D, V>
): [D | undefined, Error | undefined] {
  const { apolloClient } = useContext(apolloContext)
  if (!apolloClient) throw 'No ApolloClient provided'

  const watchQuery = configuredQuery(apolloClient)

  const [data, setData] = useState<D | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  useEffect(() => {
    const subscription = watchQuery.subscribe(
      result => setData(result.data),
      error => setError(error)
    )
    return () => subscription.unsubscribe()
  }, [])

  return [data, error]
}

// Converts a gql-snippet into a user-callable function that takes options,
// which can then be passed to useApolloMutation to provide the mutate function.
function defineMutation<V, D>(mutation: DocumentNode) {
  return function configureMutation(opts: MutateOpts<D, V> = {}) {
    return function loadMutation(client: ApolloClient<any>) {
      return function executeMutation(opts2: MutateOpts<D, V> = {}) {
        return client.mutate<D>({ mutation, ...opts, ...opts2 })
      }
    }
  }
}

// Prepares a mutate function when supplied with the exported function with
// the same name as the mutation operation.
// The React Hooks rules apply - this function must be called unconditionally
// within a functional React Component.
export function useApolloMutation<D, V>(
  configuredMutation: (
    client: ApolloClient<any>
  ) => (opts: MutateOpts<D, V>) => Promise<FetchResult<D>>
) {
  const { apolloClient } = useContext(apolloContext)
  if (!apolloClient) throw 'No ApolloClient provided'
  const mutate = configuredMutation(apolloClient)
  return mutate
}
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

type InputNames = { [name: string]: boolean }
