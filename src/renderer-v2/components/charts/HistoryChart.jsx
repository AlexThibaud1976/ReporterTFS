import React, { useRef, useEffect } from 'react'

export default function HistoryChart({ history }) {
  const canvasRef  = useRef(null)
  const wrapperRef = useRef(null)

  const draw = () => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper || history.length < 2) return

    const dpr = window.devicePixelRatio || 1
    const W   = wrapper.clientWidth
    const H   = 220

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const pad = { top: 28, right: 16, bottom: 38, left: 46 }
    const cW  = W - pad.left - pad.right
    const cH  = H - pad.top  - pad.bottom

    // ── Grille ──
    ctx.lineWidth = 1
    ;[0, 25, 50, 75, 100].forEach(pct => {
      const y = pad.top + cH - (pct / 100) * cH
      ctx.strokeStyle = pct === 0 ? '#45475a' : '#2a2a3e'
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + cW, y)
      ctx.stroke()
      ctx.fillStyle    = '#585b70'
      ctx.font         = '10px Inter, sans-serif'
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(pct + '%', pad.left - 7, y)
    })

    // ── Seuil 80% ──
    const y80 = pad.top + cH - 0.8 * cH
    ctx.save()
    ctx.strokeStyle = '#f9e2af44'
    ctx.lineWidth   = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(pad.left, y80)
    ctx.lineTo(pad.left + cW, y80)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle    = '#f9e2af66'
    ctx.font         = '9px Inter, sans-serif'
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Objectif 80%', pad.left + 5, y80 - 2)

    // ── Points ──
    const step = cW / (history.length - 1)
    const pts  = history.map((h, i) => ({
      x:    pad.left + i * step,
      y:    pad.top + cH - (Math.min(100, Math.max(0, h.passRate)) / 100) * cH,
      rate: h.passRate,
      date: h.date,
    }))

    // Aire gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH)
    grad.addColorStop(0, '#89b4fa28')
    grad.addColorStop(1, '#89b4fa02')
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pad.top + cH)
    ctx.lineTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.lineTo(pts[pts.length - 1].x, pad.top + cH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Ligne
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.strokeStyle = '#89b4fa'
    ctx.lineWidth   = 2.5
    ctx.lineJoin    = 'round'
    ctx.stroke()

    // Points + labels
    const maxLabels = Math.floor(cW / 54)
    const labelStep = Math.max(1, Math.ceil(pts.length / maxLabels))

    pts.forEach((p, i) => {
      const color = p.rate >= 80 ? '#a6e3a1' : p.rate >= 50 ? '#f9e2af' : '#f38ba8'

      // Halo
      ctx.beginPath()
      ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI)
      ctx.fillStyle = color + '28'
      ctx.fill()

      // Point
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI)
      ctx.fillStyle   = color
      ctx.fill()
      ctx.strokeStyle = '#11111b'
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Label %
      ctx.fillStyle    = '#cdd6f4'
      ctx.font         = `bold 9px Inter, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(p.rate + '%', p.x, p.y - 9)

      // Date axe X
      if (i % labelStep === 0 || i === pts.length - 1) {
        const label = p.date
          ? new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : `R${i + 1}`
        ctx.fillStyle    = '#585b70'
        ctx.font         = '10px Inter, sans-serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, p.x, pad.top + cH + 8)
      }
    })
  }

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [history])

  return (
    <div ref={wrapperRef} className="w-full">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
