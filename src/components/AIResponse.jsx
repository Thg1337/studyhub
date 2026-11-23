import React from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const remarkPlugins = [remarkMath]
const rehypePlugins = [[rehypeKatex, { throwOnError: false }]]

const components = {
  h1: ({ children }) => <h3 className="mt-5 mb-2 font-display text-lg font-bold text-fg">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-5 mb-2 font-display text-lg font-bold text-fg">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-2 font-display font-bold text-fg">{children}</h4>,
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ol: ({ children, start }) => <ol start={start} className="mb-4 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-accent">{children}</ol>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6 marker:text-accent">{children}</ul>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-4 rounded-r-xl border-l-2 border-neon-cyan bg-surface px-4 py-3">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-surface px-1 py-0.5 text-accent">{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl bg-ink-950 p-4 text-xs dark:bg-white/5">{children}</pre>,
  img: () => null,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{children}</a>
}

export default function AIResponse({ text, className = '' }) {
  if (!text) return null
  return <div className={`ai-response min-w-0 text-sm leading-7 text-gray-700 dark:text-white/85 ${className}`}>
    <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>{String(text)}</Markdown>
  </div>
}
