import {
  SelectionSetNode,
  GraphQLObjectType,
  FieldNode,
  FragmentSpreadNode,
  isObjectType,
  isScalarType,
  isEnumType,
  isUnionType,
  GraphQLOutputType,
  isNonNullType,
  isListType,
} from 'graphql'

import { TypeIR, Modifier } from '../types'
import { transformScalarType } from './Scalar'
import { transformEnumType } from './Enum'
import { transformUnionType } from './Union'

export function transformObject(
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

  let fields, scalar, fragments, union
  if (isObjectType(baseType)) {
    const fieldsAndFragments = transformObject(
      [...namespace, name],
      node.selectionSet!,
      baseType
    )
    fields = fieldsAndFragments.fields
    fragments = fieldsAndFragments.fragments
  } else if (isScalarType(baseType)) {
    scalar = transformScalarType(baseType)
  } else if (isEnumType(baseType)) {
    scalar = transformEnumType(baseType)
  } else if (isUnionType(baseType)) {
    union = transformUnionType(
      [...namespace, name],
      node.selectionSet!,
      baseType
    )
  }

  if (!fields && !scalar && !union)
    throw 'Expected field to be either scalar, object or union'

  return { namespace, name, modifiers, fields, scalar, fragments, union }

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

      if (
        isScalarType(type) ||
        isEnumType(type) ||
        isObjectType(type) ||
        isUnionType(type)
      ) {
        return type
      }

      throw 'unhandled GraphQLOutputType in unwrap'
    }

    const baseType = unwrap(type, true)
    return { modifiers, baseType }
  }
}
