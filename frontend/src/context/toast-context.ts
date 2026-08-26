import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** Milliseconds on screen. `0` keeps it until dismissed. */
  duration?: number
}

export interface ToastRecord extends Required<Omit<ToastOptions, 'description'>> {
  id: string
  description?: string
}

export interface ToastApi {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
