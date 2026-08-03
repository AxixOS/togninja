import { useState, useEffect } from "react"

type ToastType = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let toastCount = 0

// Simple global toast state
let globalToasts: ToastType[] = []
let listeners: Array<(toasts: ToastType[]) => void> = []

const notify = (toasts: ToastType[]) => {
  globalToasts = toasts
  listeners.forEach(listener => listener(toasts))
}

const addToast = (toast: ToastProps) => {
  const id = `toast-${++toastCount}`
  const newToast: ToastType = { ...toast, id }
  const newToasts = [newToast, ...globalToasts].slice(0, 5) // Limit to 5 toasts
  notify(newToasts)
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissToast(id)
  }, 5000)
  
  return { id }
}

const dismissToast = (id: string) => {
  const newToasts = globalToasts.filter(toast => toast.id !== id)
  notify(newToasts)
}

export const toast = (props: ToastProps) => {
  return addToast(props)
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastType[]>(globalToasts)

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toasts,
    toast,
    dismiss: dismissToast,
  }
}