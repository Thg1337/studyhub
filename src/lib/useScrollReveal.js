import React from 'react'

/**
 * Revela elementos marcados com `data-reveal` quando entram na viewport.
 * Usa apenas opacity + translateY (sem blur), então não reintroduz flicker.
 * Se o navegador não tiver IntersectionObserver ou o usuário preferir menos
 * movimento, tudo fica visível imediatamente.
 */
export function useScrollReveal(key) {
  React.useLayoutEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]:not(.is-revealed)'))
    if (nodes.length === 0) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-revealed'))
      return undefined
    }

    document.documentElement.classList.add('reveal-enabled')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [key])
}
