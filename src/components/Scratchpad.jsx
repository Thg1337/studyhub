import React, { useEffect, useRef, useState } from 'react'
import { GripHorizontal, Maximize2, Minimize2, Trash2, Undo2, X } from 'lucide-react'

function keepOnScreen(x, y, { width, height }) {
  const margin = 12
  return {
    x: Math.max(margin, Math.min(x, document.documentElement.clientWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin))
  }
}

function point(event) {
  const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
  const x = Math.max(0, Math.min(1000, (event.clientX - left) * 1000 / width))
  const y = Math.max(0, Math.min(600, (event.clientY - top) * 600 / height))
  return `${x.toFixed(1)} ${y.toFixed(1)}`
}

export default function Scratchpad({ open, onClose }) {
  const [strokes, setStrokes] = useState([])
  const [preview, setPreview] = useState('')
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState(null)
  const drawing = useRef(null)
  const dragging = useRef(null)
  const panel = useRef(null)
  const closeButton = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    closeButton.current?.focus()
    return () => {
      drawing.current = null
      dragging.current = null
      setPreview('')
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const element = panel.current
    const fit = () => {
      const bounds = element.getBoundingClientRect()
      setPosition((previous) => {
        if (!previous) return previous
        const next = keepOnScreen(previous.x, previous.y, bounds)
        return next.x === previous.x && next.y === previous.y ? previous : next
      })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [open])

  function startDrag(event) {
    if (event.button !== 0 || dragging.current) return
    const bounds = panel.current.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  function drag(event) {
    const handle = dragging.current
    if (handle?.id !== event.pointerId) return
    setPosition(keepOnScreen(event.clientX - handle.x, event.clientY - handle.y, panel.current.getBoundingClientRect()))
  }

  function stopDrag(event) {
    if (dragging.current?.id === event.pointerId) dragging.current = null
  }

  function moveWithKeys(event) {
    const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    const bounds = panel.current.getBoundingClientRect()
    const step = event.shiftKey ? 60 : 16
    setPosition(keepOnScreen(bounds.left + offset[0] * step, bounds.top + offset[1] * step, bounds))
  }

  function begin(event) {
    if (event.button !== 0 || drawing.current) return
    const start = point(event)
    const path = `M ${start} L ${start}`
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = { pointerId: event.pointerId, path }
    setPreview(path)
  }

  function move(event) {
    if (drawing.current?.pointerId !== event.pointerId) return
    drawing.current.path += ` L ${point(event)}`
    setPreview(drawing.current.path)
  }

  function end(event) {
    const stroke = drawing.current
    if (stroke?.pointerId !== event.pointerId) return
    drawing.current = null
    setPreview('')
    setStrokes((previous) => [...previous, stroke.path])
  }

  function close() {
    drawing.current = null
    setPreview('')
    onClose()
  }

  if (!open) return null

  return (
    <section ref={panel} id="scratchpad" role="dialog" aria-labelledby="scratchpad-title"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') close()
      }}
      className={`fixed bottom-3 right-3 z-[55] w-[calc(100%-1.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-2xl dark:bg-[#141517] sm:right-6 ${expanded ? 'sm:w-[min(46rem,calc(100vw-3rem))] lg:w-[min(46rem,58vw)]' : 'sm:w-[30rem]'}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="scratchpad-title" className="sr-only">Rascunho</h2>
        <button type="button" aria-label="Mover rascunho com as setas" title="Arraste para mover"
          className="flex min-w-0 flex-1 touch-none select-none items-center gap-2 rounded-lg text-left font-display text-lg font-bold cursor-grab active:cursor-grabbing"
          onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag}
          onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onKeyDown={moveWithKeys}>
          <GripHorizontal className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" /> Rascunho
        </button>
        <div className="flex items-center">
          <button type="button" onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? 'Reduzir rascunho' : 'Ampliar rascunho'} title={expanded ? 'Reduzir rascunho' : 'Ampliar rascunho'}
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-lg">
            <span className="grid h-7 w-7 place-items-center rounded-md transition-colors group-hover:bg-surface">
              {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            </span>
          </button>
          <button type="button" ref={closeButton} onClick={close} aria-label="Fechar rascunho"
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-lg">
            <span className="grid h-7 w-7 place-items-center rounded-md transition-colors group-hover:bg-surface">
              <X className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        </div>
      </header>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" role="img" aria-label="Quadro para escrever com mouse, caneta ou toque"
        className={`w-full touch-none select-none rounded-xl border border-line bg-surface text-fg cursor-crosshair ${expanded ? 'h-[min(48dvh,24rem)]' : 'h-[min(32dvh,17rem)]'}`}
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {strokes.map((path, index) => <path key={index} d={path} />)}
          {preview && <path d={preview} />}
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes((items) => items.slice(0, -1))}
          className="btn btn-ghost !px-3 !py-2 text-xs disabled:opacity-50"><Undo2 className="h-4 w-4" /> Desfazer traço</button>
        <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes([])}
          className="btn btn-ghost !px-3 !py-2 text-xs disabled:opacity-50"><Trash2 className="h-4 w-4" /> Limpar quadro</button>
      </div>
      <label className="mt-3 block text-sm text-muted">
        Contas digitadas
        <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-fg" />
      </label>
    </section>
  )
}
