import { useEffect } from 'react'

const SUFFIX = 'TopRank'

function setMeta(selector: string, content: string) {
  const tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (tag) tag.content = content
}

/**
 * Per-route title and description. A pre-render or SSR setup would replace this
 * with real server-rendered tags; until then it keeps tab titles, history and
 * share previews correct.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title === SUFFIX ? title : `${title} · ${SUFFIX}`

    if (description) {
      setMeta('meta[name="description"]', description)
      setMeta('meta[property="og:description"]', description)
    }
    setMeta('meta[property="og:title"]', document.title)
  }, [title, description])
}
