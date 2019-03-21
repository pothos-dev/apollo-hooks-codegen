import { FileIR } from '../types'
import { formatFragment } from './Fragment'
import { formatOperation } from './Operation'

export function formatFile(file: FileIR): string {
  let output = ''
  output += `
/*,
 * Fragments from ${file.filePath},
 */
`
  for (const fragment of file.fragments) {
    output += formatFragment(fragment)
  }

  output += `
/*,
 * Operations from ${file.filePath},
 */
`
  for (const operation of file.operations) {
    output += formatOperation(operation)
  }

  return output
}
