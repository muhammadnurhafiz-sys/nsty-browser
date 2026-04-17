import { useEffect, useState } from 'react'

/**
 * Reactive `matchMedia('(prefers-reduced-motion: reduce)')`. Returns true when
 * the user has asked for reduced motion. Use at JS sites the CSS
 * @media (prefers-reduced-motion) rule can't reach — inline transition styles,
 * JS-driven animations, and imperatively-scheduled effects.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
