import { ExecutableDefinitionNode } from 'graphql'

export function extractGQLExpression(node: ExecutableDefinitionNode): string {
  const { loc } = node
  return loc!.source.body.substring(loc!.start, loc!.end)
}
