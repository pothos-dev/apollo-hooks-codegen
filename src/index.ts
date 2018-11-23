import { CodegenPlugin, PluginFunction } from 'graphql-codegen-core'
import gqlgen from 'graphql-code-generator'

export interface PluginConfig {}

export const plugin: PluginFunction<PluginConfig> = (
  schema,
  documents,
  config
) => {
  return 'Hi!'
}
