'use client'

import { useState, useRef, type ReactNode } from 'react'

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      className="relative inline-flex"
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[var(--foreground)] text-[var(--background)] text-[10px] font-label whitespace-nowrap pointer-events-none z-50">
          {label}
        </div>
      )}
    </div>
  )
}
