import { useRef } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** Optional count/meta shown next to the label on wider screens. */
  meta?: string
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  /** Id of the element the tabs control. */
  panelId: string
  label: string
  className?: string
}

/**
 * Segmented control with full arrow-key support (WAI-ARIA tabs pattern).
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  panelId,
  label,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[index]?.focus()
    const next = items[index]
    if (next) onChange(next.id)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const current = items.findIndex((item) => item.id === value)
    if (current < 0) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusTab((current + 1) % items.length)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusTab((current - 1 + items.length) % items.length)
        break
      case 'Home':
        event.preventDefault()
        focusTab(0)
        break
      case 'End':
        event.preventDefault()
        focusTab(items.length - 1)
        break
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-md border border-line bg-surface p-1 sm:w-auto',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 text-[0.8125rem] font-medium whitespace-nowrap sm:flex-none sm:px-4',
              'transition-colors duration-200',
              selected
                ? 'bg-surface-3 text-ink shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                : 'text-ink-faint hover:text-ink-muted',
            )}
          >
            {item.label}
            {item.meta && (
              <span className="numeric ml-2 hidden text-[0.6875rem] text-ink-faint sm:inline">
                {item.meta}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
