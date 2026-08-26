import type { CredentialsInput, Session, User } from '@/types'
import { USE_MOCK_API } from './config'
import { API_CODE, ApiError, http } from './http'
import { findProjectByOwner, getUser, upsertUser } from './mock/db'
import { DEMO_USER_HANDLE } from './mock/seed'
import { simulate } from './mock/transport'

/**
 * Auth is deliberately thin: the app only ever asks for a `Session`, so an OAuth
 * provider or a real `/auth/*` API can replace the mock without the UI noticing.
 */

const STORAGE_KEY = 'toprank.demo-session'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function storeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private browsing — the session just won't survive a refresh.
  }
}

function sessionFor(user: User): Session {
  upsertUser(user)
  return { user, projectId: findProjectByOwner(user.id)?.id ?? null }
}

function assertCredentials({ email, password }: CredentialsInput) {
  if (!email.includes('@')) {
    throw new ApiError(API_CODE.VALIDATION_FAILED, 'Enter a valid email address.')
  }
  if (password.length < 8) {
    throw new ApiError(API_CODE.VALIDATION_FAILED, 'Passwords are at least 8 characters.')
  }
}

/** GET /auth/session */
export function getSession(): Promise<Session | null> {
  if (!USE_MOCK_API) {
    return http.get<Session | null>('/auth/session')
  }

  return simulate(
    () => {
      const user = readStoredUser()
      return user ? sessionFor(user) : null
    },
    { delay: [80, 200] },
  )
}

/** POST /auth/sign-in */
export function signIn(input: CredentialsInput): Promise<Session> {
  if (!USE_MOCK_API) {
    return http.post<Session>('/auth/sign-in', input)
  }

  return simulate(
    () => {
      assertCredentials(input)

      // Demo hook: sign in with the password "wrongpass" to see the error state.
      if (input.password === 'wrongpass') {
        throw new ApiError(API_CODE.UNAUTHORIZED, 'That email and password don’t match.')
      }

      const user = getUser(`usr_${DEMO_USER_HANDLE}`)
      storeUser(user)
      return sessionFor(user)
    },
    { delay: [500, 900] },
  )
}

/** POST /auth/sign-up */
export function signUp(input: CredentialsInput): Promise<Session> {
  if (!USE_MOCK_API) {
    return http.post<Session>('/auth/sign-up', input)
  }

  return simulate(
    () => {
      assertCredentials(input)

      const handle = input.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '').toLowerCase()
      const user: User = {
        id: `usr_${handle || 'you'}`,
        handle: handle || 'you',
        name: input.name?.trim() || handle,
        avatarUrl: null,
        hue: Math.floor(Math.random() * 360),
      }

      storeUser(user)
      return sessionFor(user)
    },
    { delay: [600, 1000] },
  )
}

/** GET /auth/google — a real build would redirect to the provider. */
export function signInWithGoogle(): Promise<Session> {
  if (!USE_MOCK_API) {
    window.location.href = '/auth/google'
    return new Promise<Session>(() => {})
  }

  return simulate(
    () => {
      const user = getUser(`usr_${DEMO_USER_HANDLE}`)
      storeUser(user)
      return sessionFor(user)
    },
    { delay: [700, 1200] },
  )
}

/** POST /auth/sign-out */
export function signOut(): Promise<void> {
  if (!USE_MOCK_API) {
    return http.post<void>('/auth/sign-out')
  }

  return simulate(() => storeUser(null), { delay: [150, 300] })
}
