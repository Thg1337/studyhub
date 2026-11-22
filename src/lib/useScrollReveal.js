import React from 'react'

/**
 * Revela elementos marcados com `data-reveal` quando entram na viewport.
 * Observa também o DOM (MutationObserver) para revelar conteúdo renderizado
 * depois (listas, chat, resultados de busca).
 */
export function useScrollReveal(key) {
  React.useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const reveal = (node) => {
      if (!node || node.classList.contains('is-revealed')) return
      if (reduced) {
        node.classList.add('is-revealed')
        return
      }
      node.classList.add('is-revealed')
    }

    const collect = () => Array.from(document.querySelectorAll('[data-reveal]:not(.is-revealed)'))

    if (reduced) {
      collect().forEach(reveal)
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

    const observeAll = () => {
      collect().forEach((node) => observer.observe(node))
    }
    observeAll()

    // Revela conteúdo que aparece depois (fetch, chat, listas dinâmicas).
    const mutation = new MutationObserver(() => {
      observeAll()
    })
    mutation.observe(document.body, { childList: true, subtree: true })

    // Segurança: se o observer não disparar, revela tudo após 6s.
    const fallback = window.setTimeout(() => {
      collect().forEach((node) => node.classList.add('is-revealed'))
    }, 6000)

    return () => {
      window.clearTimeout(fallback)
      mutation.disconnect()
      observer.disconnect()
    }
  }, [key])
}
