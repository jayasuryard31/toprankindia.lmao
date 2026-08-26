import { createContext, useContext } from 'react'
import type { CredentialsInput, Session, User } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'
export type AuthMode = 'sign-in' | 'sign-up'

export interface AuthApi {
  status: AuthStatus
  session: Session | null
  user: User | null
  /** True while a sign-in/sign-up request is in flight. */
  isSubmitting: boolean
  error: string | null

  modal: { open: boolean; mode: AuthMode }
  /** `onSuccess` resumes whatever the user was trying to do before the wall. */
  openAuth: (mode?: AuthMode, onSuccess?: () => void) => void
  closeAuth: () => void
  setMode: (mode: AuthMode) => void

  signIn: (input: CredentialsInput) => Promise<void>
  signUp: (input: CredentialsInput) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Re-reads the session — e.g. after a project is submitted. */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const api = useContext(AuthContext)
  if (!api) throw new Error('useAuth must be used inside <AuthProvider>')
  return api
}
