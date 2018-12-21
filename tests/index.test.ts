import { executeCodegen } from 'graphql-code-generator'
import { plugin } from '../src/index'
import * as fs from 'fs-extra'

test('basic test', async () => {
  const schema = await fs.readFile(__dirname + '/schema.graphql', {
    encoding: 'utf8',
  })
  const documents = await fs.readFile(__dirname + '/queries.graphql', {
    encoding: 'utf8',
  })

  const output = await executeCodegen({
    schema,
    documents,
    generates: {
      'output.ts': ['apollo-hooks-codegen'],
    },
    pluginLoader,
  })

  const fileContent = output.find(it => it.filename == 'output.ts').content
  expect(fileContent).toMatchSnapshot()
})

function pluginLoader(pluginName: string) {
  if (pluginName != 'apollo-hooks-codegen') {
    // Must be this exact string, otherwise graphql-code-generator will throw
    throw Error(`Cannot find module '${pluginName}'`)
  }

  return { plugin }
}
