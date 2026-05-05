import { useEffect, useRef } from 'react'

// Very subtle tilt — only when cursor is directly over the element.
// No neighbor counter-tilt (that's what caused the "abnormal" movement).
const TILT_MAX   = 1   // degrees max — barely perceptible, feels premium
const STIFFNESS  = 0.08  // very lazy spring → slow, smooth
const DAMPING    = 0.82  // high damping → no oscillation
const HOT_SPEED  = 0.12

interface State {
  tx: number; ty: number
  vx: number; vy: number
  ttx: number; tty: number
  hot: number; thot: number
  edge: number; tedge: number
  mx: number; my: number
}

const mkState = (): State => ({
  tx: 0, ty: 0, vx: 0, vy: 0, ttx: 0, tty: 0,
  hot: 0, thot: 0, edge: 0, tedge: 0,
  mx: 50, my: 50,
})

export function useLiquidGlass() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const states = new WeakMap<HTMLElement, State>()
    let elements: HTMLElement[] = []
    let mouseX = -9999
    let mouseY = -9999

    const get = (el: HTMLElement) => {
      if (!states.has(el)) states.set(el, mkState())
      return states.get(el)!
    }

    const rebuild = () => {
      elements = Array.from(
        document.querySelectorAll<HTMLElement>('.glass, .glass-strong')
      )
      elements.forEach(get)
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      mouseX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
      mouseY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
    }

    const loop = () => {
      for (const el of elements) {
        const s = get(el)
        const r = el.getBoundingClientRect()

        // Normalised cursor position within the element (0–100%)
        const px = ((mouseX - r.left) / r.width)  * 100
        const py = ((mouseY - r.top)  / r.height) * 100
        const over = px >= 0 && px <= 100 && py >= 0 && py <= 100

        if (over) {
          // Tilt toward cursor: rotateY on horizontal axis, rotateX on vertical
          s.tty = (px - 50) / 50 * TILT_MAX
          s.ttx = -((py - 50) / 50) * TILT_MAX
          s.mx  = px
          s.my  = py
          s.thot  = 1
          s.tedge = 1
        } else {
          // Cursor left: spring back to flat
          s.ttx = 0
          s.tty = 0
          s.thot  = 0
          s.tedge = 0
        }

        // Spring integration
        s.vx = (s.vx + (s.ttx - s.tx) * STIFFNESS) * DAMPING
        s.vy = (s.vy + (s.tty - s.ty) * STIFFNESS) * DAMPING
        s.tx += s.vx
        s.ty += s.vy

        // Hotspot / edge shimmer smooth
        s.hot  += (s.thot  - s.hot)  * HOT_SPEED
        s.edge += (s.tedge - s.edge) * HOT_SPEED

        el.style.setProperty('--mx',     s.mx.toFixed(2) + '%')
        el.style.setProperty('--my',     s.my.toFixed(2) + '%')
        el.style.setProperty('--tilt-x', s.tx.toFixed(3) + 'deg')
        el.style.setProperty('--tilt-y', s.ty.toFixed(3) + 'deg')
        el.style.setProperty('--hot',    s.hot.toFixed(3))
        el.style.setProperty('--edge',   s.edge.toFixed(3))
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rebuild()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    rafRef.current = requestAnimationFrame(loop)

    const obs = new MutationObserver(rebuild)
    obs.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      obs.disconnect()
    }
  }, [])
}
