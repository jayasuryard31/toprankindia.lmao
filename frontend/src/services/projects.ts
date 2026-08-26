import type { BidReceipt, ProjectStanding, SubmitProjectInput } from '@/types'
import { USE_MOCK_API } from './config'
import { API_CODE, ApiError, http } from './http'
import { buildStanding, insertProject } from './mock/db'
import { simulate } from './mock/transport'
import { getSession } from './auth'

/**
 * GET /projects/me — the signed-in user's project and where it stands.
 * Resolves to `null` when they haven't submitted one yet.
 */
export async function getMyProject(): Promise<ProjectStanding | null> {
  if (!USE_MOCK_API) {
    return http.get<ProjectStanding | null>('/projects/me')
  }

  const session = await getSession()
  if (!session?.projectId) return null

  const projectId = session.projectId
  return simulate(() => buildStanding(projectId), { delay: [300, 600], failable: true })
}

/**
 * GET /projects/:id
 */
export function getProjectStanding(projectId: string): Promise<ProjectStanding> {
  if (!USE_MOCK_API) {
    return http.get<ProjectStanding>(`/projects/${projectId}`)
  }

  return simulate(() => buildStanding(projectId), { delay: [250, 500], failable: true })
}

/**
 * POST /projects — creates the project and its opening bid in one shot.
 */
export async function submitProject(input: SubmitProjectInput): Promise<BidReceipt> {
  if (!USE_MOCK_API) {
    return http.post<BidReceipt>('/projects', input)
  }

  const session = await getSession()
  if (!session) {
    throw new ApiError(API_CODE.UNAUTHORIZED, 'Sign in to put a project on the board.')
  }

  return simulate(() => insertProject(input, session.user), { delay: [700, 1200] })
}
