import {
  VariableDefinitionNode,
  TypeNode,
  NamedTypeNode,
  GraphQLInputObjectType,
  GraphQLInputField,
  GraphQLInputType,
  isNonNullType,
  isListType,
  isEnumType,
  isScalarType,
  isInputObjectType,
} from 'graphql'
import { TypeIR, Modifier } from '../types'
import { transformScalarType, getCustomScalarName } from './Scalar'
import { transformEnumType } from './Enum'
import { Config, Schema, InputTypes } from './Globals'

export function getVariableType(
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
        return Config().idType || 'string'
      default: {
        const schemaName = node.name.value
        const nodeType = Schema().getType(schemaName)!.astNode!.kind
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
    if (InputTypes().find(it => it.name == schemaName)) return

    // add this type to inputTypes first, to avoid infinite recursion when
    // we process its field (if it is a recursive type)
    const fields: TypeIR[] = []
    InputTypes().push({
      namespace: [],
      name: schemaName,
      fields,
    })

    const schemaType = Schema().getType(schemaName) as GraphQLInputObjectType
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
