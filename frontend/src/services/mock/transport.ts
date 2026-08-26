import { API_CODE, ApiError } from '../http'

/**
 * Scenario switch for demoing non-happy-path UI without a backend.
 *
 *   ?demo=loading  reads never resolve — skeletons stay up
 *   ?demo=error    reads fail — error states render
 *   ?demo=empty    the leaderboard comes back with nothing in it
 */
export type DemoScenario = 'normal' | 'loading' | 'error' | 'empty'

const SCENARIOS: DemoScenario[] = ['normal', 'loading', 'error', 'empty']

export function demoScenario(): DemoScenario {
  if (typeof window === 'undefined') return 'normal'
  const value = new URLSearchParams(window.location.search).get('demo')
  return SCENARIOS.includes(value as DemoScenario) ? (value as DemoScenario) : 'normal'
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const jitter = (min: number, max: number) => min + Math.random() * (max - min)

interface SimulateOptions {
  /** Latency window in ms. */
  delay?: [number, number]
  /** Whether `?demo=error` should make this call fail. Reads: yes. Writes: no. */
  failable?: boolean
}

/** Runs a mock operation behind realistic latency. */
export async function simulate<T>(
  produce: () => T | Promise<T>,
  { delay = [220, 520], failable = false }: SimulateOptions = {},
): Promise<T> {
  const scenario = demoScenario()

  if (failable && scenario === 'loading') {
    // Long enough that loading states are inspectable, short enough to escape.
    await wait(600_000)
  }

  await wait(jitter(delay[0], delay[1]))

  if (failable && scenario === 'error') {
    throw new ApiError(
      API_CODE.SERVER_ERROR,
      'The leaderboard is taking a nap. Try again in a moment.',
    )
  }

  return produce()
}
