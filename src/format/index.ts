import { PluginIR } from '../types'
import { disclaimer, imports, boilerplate } from './Boilerplate'
import { formatInputTypes } from './InputType'
import { formatFile } from './File'

export function format(plugin: PluginIR): string {
  return [
    disclaimer,
    imports,
    '',
    formatInputTypes(plugin.inputTypes),
    ...plugin.files.map(formatFile),
    '',
    boilerplate,
  ].join('\n')
}
