import { useEffect, useRef } from 'react'

interface Spring {
  value: number
  velocity: number
  target: number
}

function spring(s: Spring, stiffness = 0.12, damping = 0.72): void {
  const force = (s.target - s.value) * stiffness
  s.velocity = s.velocity * damping + force
  s.value += s.velocity
}

export function useLiquidGlass(selector = '.glass, .glass-strong') {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const cards: {
      el: HTMLElement
      mx: Spring
      my: Spring
      hot: Spring
    }[] = []

    const rebuild = () => {
      cards.length = 0
      document.querySelectorAll<HTMLElement>(selector).forEach(el => {
        cards.push({
          el,
          mx: { value: 0.5, velocity: 0, target: 0.5 },
          my: { value: 0.5, velocity: 0, target: 0.5 },
          hot: { value: 0, velocity: 0, target: 0 },
        })
      })
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      const cx = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
      const cy = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY

      cards.forEach(c => {
        const r = c.el.getBoundingClientRect()
        const nx = (cx - r.left) / r.width
        const ny = (cy - r.top) / r.height
        const inBounds = nx > -0.2 && nx < 1.2 && ny > -0.2 && ny < 1.2
        c.mx.target = inBounds ? nx : 0.5
        c.my.target = inBounds ? ny : 0.5
        c.hot.target = inBounds ? 1 : 0
      })
    }

    const loop = () => {
      cards.forEach(c => {
        spring(c.mx)
        spring(c.my)
        spring(c.hot)
        const tx = (c.mx.value - 0.5) * 12
        const ty = (c.my.value - 0.5) * 8
        c.el.style.setProperty('--mx', String(c.mx.value))
        c.el.style.setProperty('--my', String(c.my.value))
        c.el.style.setProperty('--tilt-x', String(ty))
        c.el.style.setProperty('--tilt-y', String(tx))
        c.el.style.setProperty('--hot', String(c.hot.value))
      })
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
  }, [selector])
}
