import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { GoogleMark } from '@/components/ui/icons'

/**
 * Sign in / sign up. The form talks to `services/auth`, so wiring a real
 * provider means changing that module — not this component.
 */
export function AuthModal() {
  const { modal, closeAuth } = useAuth()
  const isSignUp = modal.mode === 'sign-up'

  return (
    <Modal
      open={modal.open}
      onClose={closeAuth}
      size="sm"
      title={isSignUp ? 'Create your account' : 'Welcome back'}
      description={
        isSignUp
          ? 'One account, one project, endless outbidding.'
          : 'Sign in to bid and defend your rank.'
      }
    >
      {/* Mounted only while open, so the fields reset between visits. */}
      <AuthForm isSignUp={isSignUp} />
    </Modal>
  )
}

function AuthForm({ isSignUp }: { isSignUp: boolean }) {
  const { setMode, signIn, signUp, signInWithGoogle, isSubmitting, error } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const credentials = { email, password, name }
    void (isSignUp ? signUp(credentials) : signIn(credentials))
  }

  return (
    <div className="flex flex-col gap-5">
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        loading={isSubmitting}
        loadingLabel="Contacting Google…"
        onClick={() => void signInWithGoogle()}
      >
        <GoogleMark className="size-4" />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="eyebrow">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {isSignUp && (
          <Input
            label="Name"
            autoComplete="name"
            placeholder="Kavya Nair"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Input
          label="Password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="At least 8 characters"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p
            role="alert"
            className="rounded-md border border-down/30 bg-down/10 px-3 py-2 text-[0.8125rem] text-down"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingLabel={isSignUp ? 'Creating account…' : 'Signing in…'}
          disabled={!email || !password}
        >
          {isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-[0.8125rem] text-ink-muted">
        {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? 'sign-in' : 'sign-up')}
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>

      <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[0.75rem] leading-relaxed text-ink-faint">
        <span className="font-medium text-ink-muted">Demo mode.</span> No account is created and
        nothing is stored on a server. Any email works — try the password{' '}
        <code className="numeric text-ink-muted">wrongpass</code> to see the failure state.
      </p>
    </div>
  )
}
