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
  GraphQLField,
  GraphQLType,
  GraphQLSchema,
  DocumentNode,
  NameNode,
  GraphQLEnumType,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  ExecutableDefinitionNode,
} from 'graphql'
import {
  TypeIR,
  PluginConfig,
  OperationIR,
  Modifier,
  PluginIR,
  FileIR,
  FragmentIR,
} from './types'
import { DocumentFile } from 'graphql-codegen-core'

export function transform(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
): PluginIR {
  const inputTypes: TypeIR[] = []

  return {
    files: documents.map(transformDocumentFile),
    inputTypes,
  }

  function transformDocumentFile(file: DocumentFile): FileIR {
    return {
      filePath: file.filePath,
      operations: file.content.definitions
        .filter(it => it.kind == 'OperationDefinition')
        .map(transformOperationDefinitionNode),
      fragments: file.content.definitions
        .filter(it => it.kind == 'FragmentDefinition')
        .map(transformFragmentDefinitionNode),
    }
  }

  function transformOperationDefinitionNode(
    node: OperationDefinitionNode
  ): OperationIR {
    const name = node.name.value
    const operationType = node.operation
    const gqlExpression = extractGQLExpression(node)
    const variables = extractVariables([name], node)
    const data = extractData([name], node)
    const fragments = extractFragments(data)

    return { name, operationType, gqlExpression, data, variables, fragments }
  }

  function extractFragments(rootType: TypeIR): string[] | undefined {
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

  function transformFragmentDefinitionNode(
    node: FragmentDefinitionNode
  ): FragmentIR {
    const name = node.name.value
    const gqlExpression = extractGQLExpression(node)

    const namespace = [name]
    const schemaType = schema.getType(
      node.typeCondition.name.value
    ) as GraphQLObjectType
    const { fields } = transformObject(namespace, node.selectionSet, schemaType)

    return { name, fields, gqlExpression }
  }

  function extractGQLExpression(node: ExecutableDefinitionNode): string {
    const { loc } = node
    return loc.source.body.substring(loc.start, loc.end)
  }

  function extractVariables(
    namespace: string[],
    node: OperationDefinitionNode
  ): TypeIR {
    const name = 'variables'
    const fields = node.variableDefinitions.map(node =>
      getVariableType([...namespace, 'variables'], node)
    )
    return { namespace, name, fields }
  }

  function getVariableType(
    namespace: string[],
    node: VariableDefinitionNode
  ): TypeIR {
    const name = node.variable.name.value

    // todo node.defaultValue
    const { modifiers, baseType } = getModifiersAndBaseType(node.type)
    const scalar = getScalarName(baseType)

    return { namespace, name, modifiers, scalar }

    function getModifiersAndBaseType(
      typeNode: TypeNode
    ): { modifiers?: Modifier[]; baseType: NamedTypeNode } {
      let modifiers: TypeIR['modifiers']
      function addModifier(modifier: Modifier) {
        if (!modifiers) modifiers = []
        modifiers.push(modifier)
      }

      function unwrap(typeNode: TypeNode, nullable: boolean): NamedTypeNode {
        if (typeNode.kind == 'NonNullType') {
          return unwrap(typeNode.type, false)
        }

        if (nullable) {
          addModifier('Nullable')
        }

        if (typeNode.kind == 'ListType') {
          addModifier('ReadonlyArray')
          return unwrap(typeNode.type, true)
        }

        if (typeNode.kind == 'NamedType') {
          return typeNode
        }

        throw 'unhandled TypeNode in unwrap'
      }

      const baseType = unwrap(typeNode, true)
      return { modifiers, baseType }
    }

    function getScalarName(node: NamedTypeNode) {
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
        default: {
          const schemaName = node.name.value
          const nodeType = schema.getType(schemaName).astNode.kind
          if (nodeType == 'ScalarTypeDefinition') {
            return getCustomScalarName(schemaName)
          } else {
            registerInputType(schemaName)
            return schemaName
          }
        }
      }
    }

    function registerInputType(schemaName: string) {
      if (inputTypes.find(it => it.name == schemaName)) return

      // add this type to inputTypes first, to avoid infinite recursion when
      // we process its field (if it is a recursive type)
      const fields: TypeIR[] = []
      inputTypes.push({
        namespace: [],
        name: schemaName,
        fields,
      })

      const schemaType = schema.getType(schemaName) as GraphQLInputObjectType
      const fieldMap = schemaType.getFields()
      for (const field of Object.values(fieldMap)) {
        fields.push(transformField([schemaName], field))
      }

      function transformField(
        namespace: string[],
        field: GraphQLInputField
      ): TypeIR {
        const { modifiers, baseType } = getModifiersAndBaseType(field.type)
        return {
          namespace,
          name: field.name,
          modifiers,
          scalar: baseType,
        }

        function getModifiersAndBaseType(
          node: GraphQLInputType
        ): { modifiers?: Modifier[]; baseType: string } {
          let modifiers: TypeIR['modifiers']
          function addModifier(modifier: Modifier) {
            if (!modifiers) modifiers = []
            modifiers.push(modifier)
          }

          function unwrap(node: GraphQLInputType, nullable: boolean): string {
            if (isNonNullType(node)) {
              return unwrap(node.ofType, false)
            }

            if (nullable) {
              addModifier('Nullable')
            }

            if (isListType(node)) {
              addModifier('ReadonlyArray')
              return unwrap(node.ofType, true)
            }

            if (isEnumType(node)) {
              return transformEnumType(node)
            }

            if (isScalarType(node)) {
              return transformScalarType(node)
            }

            if (isInputObjectType(node)) {
              registerInputType(node.name)
              return node.name
            }
            throw 'Unhandled GraphQLInputType in unwrap'
          }

          const baseType = unwrap(node, true)
          return { modifiers, baseType }
        }
      }
    }
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

  function transformObject(
    namespace: string[],
    selectionSet: SelectionSetNode,
    object: GraphQLObjectType
  ): { fields: TypeIR[]; fragments: string[] } {
    return {
      fields: selectionSet.selections
        .filter(it => it.kind == 'Field')
        .map(it => getTypeInfoFromField(namespace, it as FieldNode, object)),
      fragments: selectionSet.selections
        .filter(it => it.kind == 'FragmentSpread')
        .map(it => (it as FragmentSpreadNode).name.value),
    }
  }

  function getTypeInfoFromField(
    namespace: string[],
    node: FieldNode,
    object: GraphQLObjectType
  ): TypeIR {
    const schemaName = node.name.value
    const name = node.alias ? node.alias.value : schemaName

    const schemaField = object.getFields()[schemaName]
    const schemaType = schemaField.type

    const { modifiers, baseType } = getModifiersAndBaseType(schemaType)

    // Todo add fragments

    let fields, scalar, fragments
    if (isObjectType(baseType)) {
      const fieldsAndFragments = transformObject(
        [...namespace, name],
        node.selectionSet,
        baseType
      )
      fields = fieldsAndFragments.fields
      fragments = fieldsAndFragments.fragments
    } else if (isScalarType(baseType)) {
      scalar = transformScalarType(baseType)
    } else if (isEnumType(baseType)) {
      scalar = transformEnumType(baseType)
    }

    if (!fields && !scalar)
      throw 'Expected Field to contain either scalar or subfields'

    return { namespace, name, modifiers, fields, scalar, fragments }

    // Strip all combination of Nullable and Array modifiers from the type,
    // which yields list of modifiers and the base type
    function getModifiersAndBaseType(
      type: GraphQLOutputType
    ): { modifiers?: Modifier[]; baseType: GraphQLOutputType } {
      let modifiers: TypeIR['modifiers']
      function addModifier(modifier: Modifier) {
        if (!modifiers) modifiers = []
        modifiers.push(modifier)
      }

      function unwrap(
        type: GraphQLOutputType,
        nullable: boolean
      ): GraphQLOutputType {
        if (isNonNullType(type)) {
          return unwrap(type.ofType, false)
        }

        if (nullable) {
          addModifier('Nullable')
        }

        if (isListType(type)) {
          addModifier('ReadonlyArray')
          return unwrap(type.ofType, true)
        }

        if (isScalarType(type) || isEnumType(type) || isObjectType(type))
          return type

        throw 'unhandled GraphQLOutputType in unwrap'
      }

      const baseType = unwrap(type, true)
      return { modifiers, baseType }
    }
  }

  function transformScalarType(type: GraphQLScalarType) {
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
        return getCustomScalarName(type.name)
    }
  }

  function transformEnumType(type: GraphQLEnumType) {
    return type
      .getValues()
      .map(value => "'" + value.name + "'")
      .join(' | ')
  }

  function getCustomScalarName(schemaName: string) {
    const customName = config.scalarTypes && config.scalarTypes[schemaName]
    return customName || 'any'
  }

  function getSchemaRootObject(operation: OperationTypeNode) {
    switch (operation) {
      case 'query':
        return schema.getQueryType()
      case 'mutation':
        return schema.getMutationType()
      case 'subscription':
        return schema.getSubscriptionType()
    }
  }
}
