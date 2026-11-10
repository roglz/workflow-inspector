import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the Workflow Inspector audit form', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Workflow Inspector')
    expect(html).toContain('Analyze workflow')
    expect(html).toContain('Workflow JSON')
    expect(html).toContain('Analyze JSON')

    expect(html).toContain('id="workflow-json"')
    expect(html).toContain('for="workflow-json"')
    expect(html).toContain('type="submit"')
  })
})
