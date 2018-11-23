import { PluginFunction } from 'graphql-codegen-core'

export interface PluginConfig {}

export const plugin: PluginFunction<PluginConfig> = (
  schema,
  documents,
  config
) => {
  return 'Hi!'
}
