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
import { misplacedDirectiveMessage } from 'graphql/validation/rules/KnownDirectives'
import { fieldsConflictMessage } from 'graphql/validation/rules/OverlappingFieldsCanBeMerged'

export interface PluginConfig {
  // Typescript type used for GraphQLs `ID` type (defaults to `string`).
  idType?: string

  // Mapping of custom GraphQL scalars to typescript types. If a scalar type is omitted, `any` is used.
  scalarTypes?: { [scalarName: string]: string }
}

// main function called by graphql-code-generator. Must return the generated code as a string.
export function plugin(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
): string {
  // Here we collect the names of all Graphql input types that are used in the processed mutations or queries.
  // We will need to generate typescript interfaces for these later on.
  const inputTypeNames: InputTypeNames = {}

  // build up the main file here and return it
  return join(
    disclaimer,
    imports,
    '',
    ...documents.map(formatDocumentFile),
    '',
    formatInputNames(),
    boilerplate
  )

  function formatDocumentFile(file: DocumentFile) {
    return join(
      '',
      '',
      '/*',
      ' * Operations from ' + file.filePath,
      ' */',
      '',
      ...file.content.definitions.map(formatDefinition)
    )
  }

  function formatDefinition(node: DefinitionNode) {
    switch (node.kind) {
      case 'OperationDefinition':
        return formatOperationDefinition(node)
      default:
        throw 'unhandled DefinitionNode.kind = ' + node.kind
    }
  }

  function formatOperationDefinition(node: OperationDefinitionNode) {
    const name = node.name.value
    const define = definerFunction(node.operation)
    const schemaObject = selectSchemaObject(node.operation)

    return join(
      `export const ${name} = ${define}<${name}.variables, ${name}.data>(gql\``,
      indent(formatLoc(node.loc), '  '),
      '`)',
      `export module ${name} {`,
      formatVariables(),
      formatData(),
      '}',
      ''
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

    function formatVariables() {
      return '  interface variables {}'
    }

    function formatData() {
      return join(
        '  interface data{',
        ...node.selectionSet.selections.map(selectionNode =>
          formatSelectionNode(selectionNode, schemaObject)
        ),
        '  }'
      )

      // return 'interface data {}'
      // formatSelectionSet(node.selectionSet.selections)
      function formatSelectionNode(
        node: SelectionNode,
        schemaObject: GraphQLObjectType
      ) {
        switch (node.kind) {
          case 'Field':
            return formatFieldNode(node, schemaObject)
          default:
            throw 'unhandled SelectionNode.kind = ' + node.kind
        }
      }

      function formatFieldNode(
        node: FieldNode,
        schemaObject: GraphQLObjectType
      ) {
        let schemaName = node.name.value
        let tsFieldName = node.name.value
        if (node.alias) tsFieldName = node.alias.value

        const schemaField = schemaObject.getFields()[schemaName]
        const isRequired = isNonNullType(schemaField.type)
        const questionMark = isRequired ? '' : '?'

        return '    ' + tsFieldName + ': unknown'
      }
    }
  }

  // function formatSelectionSet(
  //   node: SelectionSetNode,
  //   object: GraphQLObjectType,
  //   module: string[]
  // ) {
  //   let spaces = ' '.repeat(module.length * 2)
  //   let innermostModule = module[module.length - 1]

  //   return join(`module ${innermostModule} {`, `}`)
  // }

  function formatLoc(loc: Location) {
    return loc.source.body.substring(loc.start, loc.end)
  }

  function formatVariableDefinitions(
    nodes: ReadonlyArray<VariableDefinitionNode>
  ) {
    const list = nodes.map(variableNode =>
      formatVariableDefinition(variableNode)
    )
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
        return config.idType || 'string'
      default:
        const nodeType = schema.getType(node.name.value).astNode.kind
        if (nodeType == 'ScalarTypeDefinition') {
          return formatCustomScalar(node.name.value)
        } else {
          inputTypeNames[node.name.value] = true
          return node.name.value
        }
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
      formatGraphQLOutputType(
        schemaField.type,
        node.selectionSet,
        offset + '  '
      )
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
    return (
      'null | ' + formatGraphQLOutputTypeNotNull(type, selectionSet, offset)
    )
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
        return config.idType || 'string'
      default:
        return formatCustomScalar(type.name)
    }
  }

  function formatCustomScalar(name: string) {
    const customName = config.scalarTypes && config.scalarTypes[name]
    return customName || 'any'
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

  function selectSchemaObject(operation: OperationTypeNode) {
    switch (operation) {
      case 'query':
        return schema.getQueryType()
      case 'mutation':
        return schema.getMutationType()
      case 'subscription':
        return schema.getSubscriptionType()
    }
  }

  /*
   * Formatting GraphQL Input Types
   */

  function formatInputNames() {
    findRecursiveInputReferences(Object.keys(inputTypeNames))

    if (Object.keys(inputTypeNames).length == 0) return ''

    return join(
      '/*',
      ' * GraphQL InputTypes',
      ' */',
      '',
      ...Object.keys(inputTypeNames).map(name => {
        const node = schema.getType(name) as GraphQLInputObjectType
        return formatGraphQLInputObjectType(node)
      })
    )
  }

  function findRecursiveInputReferences(newNames: string[]) {
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

    findRecursiveInputReferences(newNames2)

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
        if (!inputTypeNames[node.name]) {
          inputTypeNames[node.name] = true
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

  function formatInputType(node: GraphQLInputType): string {
    if (isNonNullType(node)) {
      return node.ofType
    }
    if (isListType(node)) {
      return 'ReadonlyArray<' + formatInputType(node.ofType) + '>'
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
}

const disclaimer = `
/*
 * This file was generated by graphql-code-generator with the apollo-hooks-codegen plugin.
 * Any changes made to the file will be overwritten.
 */
`

const imports = `
import * as React from 'react'
import { createContext, useEffect, useState, useContext } from 'react'
import ApolloClient, {
  MutationOptions,
  ObservableQuery,
  WatchQueryOptions,
  ApolloCurrentResult,
} from 'apollo-client'
import { FetchResult } from 'apollo-link'
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
  children?: React.ReactNode
  apolloClient: ApolloClient<any> | undefined
}) {
  const elementType = apolloContext.Provider
  const elementProps: React.ProviderProps<ContextType> = {
    value: { apolloClient },
  }
  return React.createElement(elementType, elementProps, children)
}

// Converts a gql-snippet into a user-callable function that takes options,
// which can then be passed to useApolloQuery to execute the query.
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
export function useApolloQuery<D, V>(
  configuredQuery: (client: ApolloClient<any>) => ObservableQuery<D, V>
): [ApolloCurrentResult<D>, ObservableQuery<D, V>] {
  const { apolloClient } = useContext(apolloContext)
  if (!apolloClient) throw 'No ApolloClient provided'

  const query = configuredQuery(apolloClient)

  const [result, setResult] = useState(query.currentResult())
  useEffect(() => {
    const subscription = query.subscribe(setResult)
    return () => subscription.unsubscribe()
  }, [])

  return [result, query]
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
  ) => (opts?: MutateOpts<D, V>) => Promise<FetchResult<D>>
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

type InputTypeNames = { [name: string]: boolean }
