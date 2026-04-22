"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type hsl = { h: number; s: number; l: number }
type Color = hsl & { hex: string }

function hslToHex({ h, s, l }: hsl): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
  const toHex = (x: number) => {
    const h = Math.round(255 * x).toString(16)
    return h.length === 1 ? "0" + h : h
  }
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}

function hexToHsl(hex: string): hsl {
  hex = hex.replace(/^#/, "")
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("")
  while (hex.length < 6) hex += "0"
  const r = parseInt(hex.slice(0, 2), 16) / 255 || 0
  const g = parseInt(hex.slice(2, 4), 16) / 255 || 0
  const b = parseInt(hex.slice(4, 6), 16) / 255 || 0
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h = Math.round((h / 6) * 360)
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function sanitizeHex(val: string) {
  return val.replace(/[^a-fA-F0-9]/g, "").toUpperCase()
}

function DraggableCanvas({
  h, s, l,
  onChange,
}: hsl & { onChange: (partial: Partial<hsl>) => void }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const calc = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const newS = Math.round(Math.max(0, Math.min((clientX - rect.left) / rect.width, 1)) * 100)
    const newL = Math.round((1 - Math.max(0, Math.min((clientY - rect.top) / rect.height, 1))) * 100)
    onChange({ s: newS, l: newL })
  }, [onChange])

  const onMouseMove = useCallback((e: MouseEvent) => { e.preventDefault(); calc(e.clientX, e.clientY) }, [calc])
  const onMouseUp = useCallback(() => setDragging(false), [])
  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    if (t) calc(t.clientX, t.clientY)
  }, [calc])
  const onTouchEnd = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd)
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [dragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd])

  return (
    <div
      ref={ref}
      className="h-40 w-full touch-none rounded-lg border border-border"
      style={{
        background: `linear-gradient(to top, #000, transparent, #fff), linear-gradient(to left, hsl(${h}, 100%, 50%), #bbb)`,
        position: "relative",
        cursor: "crosshair",
      }}
      onMouseDown={(e) => { e.preventDefault(); setDragging(true); calc(e.clientX, e.clientY) }}
      onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; if (t) { setDragging(true); calc(t.clientX, t.clientY) } }}
    >
      <div
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white ring-1 ring-border dark:border-popover dark:ring-border"
        style={{
          left: `${s}%`,
          top: `${100 - l}%`,
          background: `hsl(${h}, ${s}%, ${l}%)`,
        }}
      />
    </div>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (v: string) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [color, setColor] = useState<Color>(() => {
    const hsl = hexToHsl(value)
    return { ...hsl, hex: sanitizeHex(value.replace("#", "")) }
  })
  const [hexInput, setHexInput] = useState(sanitizeHex(value.replace("#", "")))
  const [prevValue, setPrevValue] = useState(value)

  // Sync from external value changes — render-time pattern (no useEffect),
  // así evitamos el cascading render que prohíbe react-hooks/set-state-in-effect.
  if (value !== prevValue) {
    setPrevValue(value)
    const clean = sanitizeHex(value.replace("#", ""))
    if (clean.length === 6 && clean !== color.hex) {
      const hsl = hexToHsl(value)
      setColor({ ...hsl, hex: clean })
      setHexInput(clean)
    }
  }

  function update(partial: Partial<Color>) {
    setColor((prev) => {
      const next = { ...prev, ...partial }
      const hex = sanitizeHex(hslToHex({ h: next.h, s: next.s, l: next.l }).replace("#", ""))
      const result = { ...next, hex }
      onChange(`#${hex}`)
      return result
    })
  }

  function handleHexInput(val: string) {
    const clean = sanitizeHex(val)
    setHexInput(clean)
    if (clean.length === 6) {
      const hsl = hexToHsl(clean)
      const result = { ...hsl, hex: clean }
      setColor(result)
      onChange(`#${clean}`)
    }
  }

  return (
    <div className="flex w-65 select-none flex-col gap-3 p-3">
      <DraggableCanvas
        h={color.h} s={color.s} l={color.l}
        onChange={(p) => update(p)}
      />
      <input
        type="range"
        min="0"
        max="360"
        value={color.h}
        className="color-picker-hue h-3 w-full cursor-pointer appearance-none rounded-full border border-border"
        style={{
          background: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`,
        }}
        onChange={(e) => update({ h: e.target.valueAsNumber })}
      />
      <div className="relative">
        <span className="absolute inset-y-0 left-2.5 flex items-center text-xs font-mono text-muted-foreground">#</span>
        <input
          type="text"
          value={hexInput}
          maxLength={6}
          onChange={(e) => handleHexInput(e.target.value)}
          className={cn(
            "h-8 w-full rounded-md border border-input bg-input/20 pl-6 pr-10 font-mono text-xs uppercase outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "dark:bg-input/30"
          )}
          placeholder="RRGGBB"
        />
        <div
          className="absolute inset-y-0 right-1.5 my-auto size-6 rounded-md border border-border"
          style={{ backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)` }}
        />
      </div>
    </div>
  )
}

export { ColorPicker }
