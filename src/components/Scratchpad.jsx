import React, { useEffect, useRef, useState } from 'react'
import { Trash2, Undo2, X } from 'lucide-react'

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
  const drawing = useRef(null)
  const closeButton = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    closeButton.current?.focus()
    return () => {
      drawing.current = null
      setPreview('')
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

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
    <section id="scratchpad" role="dialog" aria-labelledby="scratchpad-title"
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') close()
      }}
      className="fixed inset-x-3 bottom-3 z-[55] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-2xl dark:bg-[#141517] sm:left-auto sm:right-6 sm:w-[30rem]">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="scratchpad-title" className="font-display text-lg font-bold">Rascunho</h2>
        <button type="button" ref={closeButton} onClick={close} aria-label="Fechar rascunho"
          className="group grid h-11 w-11 shrink-0 place-items-center rounded-lg">
          <span className="grid h-7 w-7 place-items-center rounded-md transition-colors group-hover:bg-surface">
            <X className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </header>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" role="img" aria-label="Quadro para escrever com mouse, caneta ou toque"
        className="h-[min(32dvh,17rem)] w-full touch-none select-none rounded-xl border border-line bg-surface text-fg cursor-crosshair"
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
