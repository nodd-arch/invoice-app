'use client'
import { useRef, useEffect, useCallback } from 'react'

interface Props {
  onApply: (dataUrl: string) => void
  onRemove: () => void
}

export default function SignaturePad({ onApply, onRemove }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasStrokes = useRef(false)

  // Set canvas internal resolution once mounted
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // Use display size as internal resolution
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? e.touches[0] : e
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    hasStrokes.current = true
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [])

  const stopDraw = useCallback(() => {
    drawing.current = false
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // Re-read display size in case of resize
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    hasStrokes.current = false
    onRemove()
  }

  const apply = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes.current) return
    onApply(canvas.toDataURL('image/png'))
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        border: '1.5px solid var(--border)',
        borderRadius: 8,
        background: '#fff',
        overflow: 'hidden',
        cursor: 'crosshair',
        userSelect: 'none',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: 110, touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={e => { e.preventDefault(); startDraw(e) }}
          onTouchMove={e => { e.preventDefault(); draw(e) }}
          onTouchEnd={stopDraw}
        />
      </div>
      <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5 }}>
        Use mouse or finger to sign above
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={apply} style={{
          padding: '7px 14px', background: 'var(--ink)', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
          cursor: 'pointer', fontWeight: 600,
        }}>
          ✓ Apply to Document
        </button>
        <button onClick={clear} style={{
          padding: '7px 14px', background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 6, fontSize: 12,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>
          ↺ Clear
        </button>
        <button onClick={onRemove} style={{
          padding: '7px 14px', background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 6, fontSize: 12,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>
          ✕ Remove
        </button>
      </div>
    </div>
  )
}
