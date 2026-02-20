import React, { useRef, useEffect } from 'react'

export default function DonutChart({ metrics }) {
  const canvasRef  = useRef(null)
  const wrapperRef = useRef(null)

  const draw = () => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const dpr = window.devicePixelRatio || 1
    const W   = wrapper.clientWidth

    const segments = [
      { value: metrics.passed,      color: '#a6e3a1', label: 'Réussis' },
      { value: metrics.failed,      color: '#f38ba8', label: 'Échoués' },
      { value: metrics.blocked,     color: '#f9e2af', label: 'Bloqués' },
      { value: metrics.notExecuted, color: '#6c7086', label: 'Non exécutés' },
    ].filter(s => s.value > 0)

    const total = segments.reduce((a, s) => a + s.value, 0)
    if (!W || total === 0) return

    const legendRows = Math.ceil(segments.length / 2)
    const legendH    = legendRows * 22 + 14
    const donutSize  = Math.min(W, 200)
    const H          = donutSize + legendH

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2
    const cy = donutSize / 2
    const r  = donutSize * 0.39
    const ri = r * 0.63
    const gap = segments.length > 1 ? 0.022 : 0

    // Segments
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur  = 10
    let angle = -Math.PI / 2
    segments.forEach(seg => {
      const sweep = (seg.value / total) * 2 * Math.PI - gap
      ctx.beginPath()
      ctx.arc(cx, cy, r,  angle + gap / 2, angle + gap / 2 + sweep)
      ctx.arc(cx, cy, ri, angle + gap / 2 + sweep, angle + gap / 2, true)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      angle += sweep + gap
    })
    ctx.shadowBlur = 0

    // Trou + anneau intérieur
    ctx.beginPath()
    ctx.arc(cx, cy, ri - 2, 0, 2 * Math.PI)
    ctx.fillStyle = '#11111b'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, ri - 2, 0, 2 * Math.PI)
    ctx.strokeStyle = '#313244'
    ctx.lineWidth = 1
    ctx.stroke()

    // Texte centré
    const rateColor  = metrics.passRate >= 80 ? '#a6e3a1' : metrics.passRate >= 50 ? '#f9e2af' : '#f38ba8'
    const rateFont   = Math.min(Math.round(r * 0.46), Math.round(ri * 0.56))
    const subFont    = Math.round(rateFont * 0.48)
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle    = rateColor
    ctx.font         = `bold ${rateFont}px Inter, sans-serif`
    ctx.fillText(metrics.passRate + '%', cx, cy - rateFont * 0.26)
    ctx.fillStyle = '#6c7086'
    ctx.font      = `${subFont}px Inter, sans-serif`
    ctx.fillText('réussite', cx, cy + rateFont * 0.44)

    // Légende 2 colonnes
    const legendTop = donutSize + 10
    const colW      = W / 2
    segments.forEach((seg, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const lx  = col === 0 ? 10 : colW + 10
      const ly  = legendTop + row * 22

      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(lx, ly + 1, 9, 9, 2)
      else               ctx.rect(lx, ly + 1, 9, 9)
      ctx.fillStyle = seg.color
      ctx.fill()

      ctx.fillStyle    = '#a6adc8'
      ctx.font         = '11px Inter, sans-serif'
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${seg.label}: ${seg.value}`, lx + 14, ly + 1)
    })
  }

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [metrics])

  return (
    <div ref={wrapperRef} className="w-full">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
