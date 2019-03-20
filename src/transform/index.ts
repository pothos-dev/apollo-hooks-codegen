import { GraphQLSchema } from 'graphql'
import { DocumentFile } from 'graphql-codegen-core'
import { PluginConfig, PluginIR } from '../types'
import { setGlobals, InputTypes } from './Globals'
import { transformDocumentFile } from './DocumentFile'

export function transform(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
): PluginIR {
  setGlobals(schema, config)

  const files = documents.map(transformDocumentFile)
  const inputTypes = InputTypes()

  return { files, inputTypes }
}
