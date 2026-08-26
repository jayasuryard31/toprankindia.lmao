import { formatMoney, toDomain } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'

export interface ProjectPreviewCardProps {
  name: string
  url: string
  tagline: string
  logoUrl: string
  amount: number
}

/** Shows the submitter exactly what their row will look like on the board. */
export function ProjectPreviewCard({
  name,
  url,
  tagline,
  logoUrl,
  amount,
}: ProjectPreviewCardProps) {
  const domain = toDomain(url) || 'yourdomain.com'

  return (
    <div className="sticky top-24">
      <p className="eyebrow mb-3">Board preview</p>

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="numeric w-6 text-sm font-semibold text-ink-faint">?</span>

          <Avatar
            name={name || 'Your project'}
            src={logoUrl || null}
            hue={96}
            size="md"
            shape="square"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] leading-tight font-medium text-ink">
              {name || 'Your project'}
            </p>
            <p className="numeric truncate text-[0.75rem] text-ink-faint">{domain}</p>
          </div>

          <span className="numeric shrink-0 text-[0.9375rem] font-semibold text-ink">
            {formatMoney(amount || 0)}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 border-t border-line pt-3 text-[0.8125rem] leading-snug text-ink-muted">
          {tagline || 'One line about what your project does.'}
        </p>
      </div>

      <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
        Your rank is decided the moment your opening bid lands.
      </p>
    </div>
  )
}
