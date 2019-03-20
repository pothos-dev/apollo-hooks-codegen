import { GraphQLSchema } from 'graphql'
import { PluginConfig, TypeIR } from '../types'

let _schema: GraphQLSchema
let _config: PluginConfig
let _inputTypes: TypeIR[]

export function Schema() {
  return _schema
}

export function InputTypes() {
  return _inputTypes
}

export function Config() {
  return _config
}

export function setGlobals(schema: GraphQLSchema, config: PluginConfig) {
  _schema = schema
  _config = config
  _inputTypes = []
}
