import { useState, useCallback, useRef } from 'react'

/**
 * Hook to manage dialog open/close animations
 * Returns a close handler that plays exit animation before actually closing
 */
export function useModalClose(onClose: () => void, duration = 150) {
  const [isClosing, setIsClosing] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    timeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, duration)
  }, [onClose, duration, isClosing])

  return {
    isClosing,
    handleClose,
    modalClass: isClosing ? 'modal-exit' : 'modal-enter',
    backdropClass: isClosing ? 'backdrop-exit' : 'backdrop-enter',
  }
}
