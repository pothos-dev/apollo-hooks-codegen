import 'jsdom-global/register'
import React from 'react'
import enzyme from 'enzyme'
import EnzymeAdapter from 'enzyme-adapter-react-16'

enzyme.configure({ adapter: new EnzymeAdapter() })

function TestComponent() {
  return <div>Hello world</div>
}

test('react test', () => {
  const wrapper = enzyme.mount(<TestComponent />)
  expect(wrapper.html()).toBe('<div>Hello world</div>')
})
