import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ToastContext } from './toast-context'
import type { ToastApi, ToastOptions, ToastRecord, ToastTone } from './toast-context'

const accents: Record<ToastTone, string> = {
  success: 'bg-brand',
  error: 'bg-down',
  info: 'bg-ink-faint',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, number>())
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'info', duration = 5000 }: ToastOptions) => {
      const id = `toast_${counter.current++}`
      setToasts((current) => [...current.slice(-2), { id, title, description, tone, duration }])

      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }

      return id
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext value={api}>
      {children}

      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <div aria-live="polite" aria-atomic="false" className="contents">
          {toasts.map((item) => (
            <div
              key={item.id}
              className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 overflow-hidden rounded-lg border border-line-strong bg-surface-2 p-3.5 shadow-pop"
            >
              <span
                aria-hidden="true"
                className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', accents[item.tone])}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] leading-snug font-medium text-ink">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-[0.8125rem] leading-snug text-ink-muted">
                    {item.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={`Dismiss: ${item.title}`}
                className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext>
  )
}
