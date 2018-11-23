import { hello } from '../src'

test('basic test', () => {
  expect(hello()).toBe('hello world')
})
