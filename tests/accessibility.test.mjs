import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'localStorage', 'Event', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// jsdom has no layout; visible buttons still need to count as focusable in the modal.
dom.window.HTMLElement.prototype.getClientRects = () => [new dom.window.DOMRect(0, 0, 1, 1)]

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] }
})
const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: App } = await server.ssrLoadModule('/src/App.jsx')
const { default: useModalFocus } = await server.ssrLoadModule('/src/lib/useModalFocus.js')

after(async () => {
  await server.close()
  dom.window.close()
})

async function render(element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await React.act(async () => root.render(element))
  return async () => {
    await React.act(async () => root.unmount())
    container.remove()
    localStorage.clear()
  }
}

async function click(element) {
  await React.act(async () => element.click())
}

test('navegação move o foco e anuncia o título da nova página', async () => {
  const cleanup = await render(React.createElement(MemoryRouter, null, React.createElement(App)))
  try {
    const link = [...document.querySelectorAll('a')].find((item) => item.getAttribute('href') === '/progresso')
    assert.ok(link)
    await click(link)
    for (let attempt = 0; attempt < 20 && !document.querySelector('#conteudo-principal h1'); attempt++) {
      await React.act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
    }
    const title = document.querySelector('#conteudo-principal h1')
    assert.equal(title?.textContent, 'Painel de estudos')
    assert.equal(document.activeElement, title)
    assert.equal(document.title, 'Painel de estudos | StudyHub')
    assert.equal(document.querySelector('[role="status"][aria-live="polite"]')?.textContent, 'Página: Painel de estudos')

    const goal = document.querySelector('input[aria-label="Meta diária de questões"]')
    assert.equal(goal?.type, 'number')
    assert.equal(goal?.min, '1')
    assert.equal(goal?.max, '200')
    const importButton = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Importar dados')
    assert.equal(importButton?.type, 'button')
    importButton.focus()
    assert.equal(document.activeElement, importButton)
    assert.equal(document.querySelector('input[type="file"]')?.accept, 'application/json')
  } finally {
    await cleanup()
  }
})

function ModalHarness() {
  const [open, setOpen] = React.useState(false)
  const dialogRef = React.useRef(null)
  const initialRef = React.useRef(null)
  useModalFocus(open, dialogRef, initialRef, () => setOpen(false))
  return React.createElement(React.Fragment, null,
    React.createElement('button', { onClick: () => setOpen(true) }, 'Abrir diálogo'),
    open && React.createElement('div', { ref: dialogRef, role: 'dialog', 'aria-modal': 'true' },
      React.createElement('button', { ref: initialRef }, 'Manter'),
      React.createElement('button', null, 'Excluir')))
}

test('modal prende Tab, fecha com Escape e devolve foco ao botão', async () => {
  const cleanup = await render(React.createElement(ModalHarness))
  try {
    const trigger = document.querySelector('button')
    trigger.focus()
    await click(trigger)
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
    assert.ok(dialog)
    assert.equal(document.activeElement, dialog.querySelector('button'))
    const first = dialog.querySelector('button')
    const last = [...dialog.querySelectorAll('button')].at(-1)
    last.focus()
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, first)
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, last)
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    assert.equal(document.querySelector('[role="dialog"]'), null)
    assert.equal(document.activeElement, trigger)
  } finally {
    await cleanup()
  }
})
