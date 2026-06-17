"use client"

import { useCallback, useEffect, useState } from "react"

interface UseResizableWidthOptions {
  initialWidth: number
  minWidth: number
  maxWidth: number
}

export function useResizableWidth({ initialWidth, minWidth, maxWidth }: UseResizableWidthOptions) {
  const clamp = useCallback((value: number) => Math.min(maxWidth, Math.max(minWidth, value)), [maxWidth, minWidth])
  const [width, setWidth] = useState(() => clamp(initialWidth))
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; width: number } | null>(null)

  useEffect(() => {
    setWidth((current) => clamp(current))
  }, [clamp])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({ pointerId: event.pointerId, x: event.clientX, width })
    setIsDragging(true)
  }, [width])

  const finishDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragStart(null)
    setIsDragging(false)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return
    setWidth(clamp(dragStart.width + (event.clientX - dragStart.x)))
  }, [clamp, dragStart])

  const onLostPointerCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart && dragStart.pointerId === event.pointerId) {
      setDragStart(null)
      setIsDragging(false)
    }
  }, [dragStart])

  return {
    width,
    isDragging,
    resizeHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onLostPointerCapture,
    },
  }
}