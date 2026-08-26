import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CredentialsInput, Session } from '@/types'
import * as authService from '@/services/auth'
import { toErrorMessage } from '@/services/http'
import { AuthModal } from '@/components/auth/AuthModal'
import { AuthContext } from './auth-context'
import type { AuthApi, AuthMode, AuthStatus } from './auth-context'
import { useToast } from './toast-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()

  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; mode: AuthMode }>({
    open: false,
    mode: 'sign-in',
  })

  const pendingAction = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    authService
      .getSession()
      .then((result) => {
        if (cancelled) return
        setSession(result)
        setStatus(result ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const completeAuth = useCallback(
    (next: Session) => {
      setSession(next)
      setStatus('authenticated')
      setError(null)
      setModal((current) => ({ ...current, open: false }))

      toast({
        tone: 'success',
        title: `Welcome, ${next.user.name.split(' ')[0]}`,
        description: next.projectId
          ? 'Your project is on the board.'
          : 'Add a project to start climbing.',
      })

      const resume = pendingAction.current
      pendingAction.current = null
      // Let the auth modal unmount before the next one opens.
      if (resume) window.setTimeout(resume, 120)
    },
    [toast],
  )

  const run = useCallback(
    async (operation: () => Promise<Session>) => {
      setIsSubmitting(true)
      setError(null)
      try {
        completeAuth(await operation())
      } catch (cause) {
        setError(toErrorMessage(cause))
      } finally {
        setIsSubmitting(false)
      }
    },
    [completeAuth],
  )

  const api = useMemo<AuthApi>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isSubmitting,
      error,
      modal,

      openAuth: (mode = 'sign-in', onSuccess) => {
        pendingAction.current = onSuccess ?? null
        setError(null)
        setModal({ open: true, mode })
      },

      closeAuth: () => {
        pendingAction.current = null
        setError(null)
        setModal((current) => ({ ...current, open: false }))
      },

      setMode: (mode) => {
        setError(null)
        setModal({ open: true, mode })
      },

      signIn: (input: CredentialsInput) => run(() => authService.signIn(input)),
      signUp: (input: CredentialsInput) => run(() => authService.signUp(input)),
      signInWithGoogle: () => run(() => authService.signInWithGoogle()),

      signOut: async () => {
        await authService.signOut()
        setSession(null)
        setStatus('anonymous')
        toast({ tone: 'info', title: 'Signed out' })
      },

      refresh: async () => {
        const next = await authService.getSession()
        setSession(next)
        setStatus(next ? 'authenticated' : 'anonymous')
      },
    }),
    [status, session, isSubmitting, error, modal, run, toast],
  )

  return (
    <AuthContext value={api}>
      {children}
      <AuthModal />
    </AuthContext>
  )
}
