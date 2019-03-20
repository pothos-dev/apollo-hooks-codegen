import { FileIR } from '../types'
import { formatFragments } from './Fragment'
import { formatOperation } from './Operation'

export function formatFile(file: FileIR): string {
  return (
    `
/*,
 * Fragments from ${file.filePath},
 */


` +
    file.fragments.map(formatFragments).join('\n') +
    `
/*,
 * Operations from ${file.filePath},
 */


` +
    file.operations.map(formatOperation).join('\n')
  )
}
