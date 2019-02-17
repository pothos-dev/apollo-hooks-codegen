import { DocumentFile, GraphQLSchema } from 'graphql-codegen-core'
import { PluginConfig } from './types'
import { transform } from './transform'
import { format } from './format'

// main function called by graphql-code-generator. Must return the generated code as a string.
export function plugin(
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: PluginConfig
): string {
  const pluginIR = transform(schema, documents, config)
  return format(pluginIR)
}
