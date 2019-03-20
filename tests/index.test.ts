import { executeCodegen } from 'graphql-code-generator'
import { plugin } from '../src/index'
import * as fs from 'fs-extra'

async function readResource(filename: string) {
  return await fs.readFile(`${__dirname}/resources/${filename}`, {
    encoding: 'utf8',
  })
}

test('basic test', async () => {
  const schema = await readResource('schema.graphql')
  const documents = await readResource('documents.graphql')

  const output = await executeCodegen({
    schema,
    documents,
    generates: {
      'output.ts': ['apollo-hooks-codegen'],
    },
    pluginLoader,
  })

  const fileContent = output.find(it => it.filename == 'output.ts')!.content
  expect(fileContent).toMatchSnapshot()
})

function pluginLoader(pluginName: string) {
  if (pluginName != 'apollo-hooks-codegen') {
    // Must be this exact string, otherwise graphql-code-generator will throw
    throw Error(`Cannot find module '${pluginName}'`)
  }

  return { plugin }
}
