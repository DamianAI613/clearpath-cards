'use client'

/* Make the card fit the screen it is actually on.
 *
 * The layout is tuned so an ordinary card clears an ordinary phone, but
 * "ordinary" is doing a lot of work in that sentence: a long name with
 * credentials, a three-line tagline and seven links on a 360px Android runs
 * about 175px past the fold. CSS alone cannot fix that, because the overflow
 * depends on how much card there is, which no media query can see.
 *
 * So: measure, and if it is over, scale it down. Three rules keep that from
 * becoming its own problem.
 *
 *   The floor. 0.88 and no further. Below it the body copy drops under 13px
 *   and the primary button stops being a comfortable target. Past the floor
 *   the card scrolls, which is the honest answer rather than a failure.
 *
 *   Enlarged text wins. If the root font size is above 16px the reader has
 *   deliberately made type bigger, and shrinking it back is user-hostile.
 *   Scaling is skipped entirely and the card scrolls.
 *
 *   visualViewport, not innerHeight. Safari's toolbars slide away mid-scroll
 *   and innerHeight does not always follow; visualViewport does. */

import { useCallback, useEffect, useRef, useState } from 'react'

const FLOOR = 0.88

export function useFit(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [fit, setFit] = useState<{ scale: number; pull: number }>({ scale: 1, pull: 0 })

  const measure = useCallback(() => {
    const el = ref.current
    if (!enabled || !el) return

    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize || '16')
    if (rootPx > 17) { setFit({ scale: 1, pull: 0 }); return }

    /* scrollHeight is a layout measurement and transforms do not affect
     * layout, so this stays the unscaled height and the loop is stable. */
    const needed = el.scrollHeight
    const viewport = window.visualViewport?.height ?? window.innerHeight
    const stage = el.parentElement
    const pad = stage
      ? parseFloat(getComputedStyle(stage).paddingTop) + parseFloat(getComputedStyle(stage).paddingBottom)
      : 0
    /* Two pixels of slack. Heights are fractional and both the measurement
     * and the scaled result get rounded, which left a one-or-two pixel
     * scrollbar on cards that were otherwise exactly fitted. */
    const available = viewport - pad - 2

    if (needed <= available || needed === 0) { setFit({ scale: 1, pull: 0 }); return }

    const scale = Math.max(FLOOR, available / needed)
    /* A scaled element still occupies its full unscaled box, so without this
     * the page keeps the scroll the scaling was meant to remove. */
    setFit({ scale, pull: Math.round(needed * (1 - scale)) })
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    measure()
    /* Fonts land after first paint and change every height on the card. */
    document.fonts?.ready.then(measure).catch(() => {})
    const t = setTimeout(measure, 350)

    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.visualViewport?.addEventListener('resize', measure)
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.visualViewport?.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [enabled, measure])

  return { ref, ...fit }
}
