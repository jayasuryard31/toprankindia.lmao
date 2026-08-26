import { Link } from 'react-router-dom'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateBlock } from '@/components/ui/StateBlock'
import { ProjectSubmissionForm } from '@/components/project/ProjectSubmissionForm'

export function SubmitPage() {
  usePageMeta(
    'Add your project',
    'Put your project on the leaderboard with an opening bid. $5 gets you on the board.',
  )

  const { status, session, openAuth } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <header className="mb-10 animate-rise">
        <p className="eyebrow">Add a project</p>
        <h1 className="mt-3 text-title text-ink">Get on the board.</h1>
        <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink-muted">
          Four fields and an opening bid. Your bid decides where you enter — you can raise it any
          time after that.
        </p>
      </header>

      {status === 'loading' && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-6">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-16 w-full" rounded="md" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" rounded="lg" />
        </div>
      )}

      {status === 'anonymous' && (
        <StateBlock
          glyph="◎"
          title="Sign in to add your project"
          description="Your project is tied to your account so only you can raise its bid."
          action={
            <Button size="lg" onClick={() => openAuth('sign-up')}>
              Create an account
            </Button>
          }
        />
      )}

      {status === 'authenticated' && session?.projectId && (
        <StateBlock
          glyph="✓"
          title="You already have a project on the board"
          description="One project per account. Raise its bid to climb instead of adding another."
          action={
            <Link to="/my-project" className={buttonStyles({ size: 'lg' })}>
              Go to my project
            </Link>
          }
        />
      )}

      {status === 'authenticated' && !session?.projectId && <ProjectSubmissionForm />}
    </div>
  )
}
