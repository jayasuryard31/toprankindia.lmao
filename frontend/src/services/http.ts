import { API_BASE_URL } from './config'

/**
 * Application-level response codes returned by the backend (HTTP is always 200).
 * Mirrors `backend/Globals/response.js`.
 */
export const API_CODE = {
  SUCCESS: 1000,
  CREATED: 1001,
  BAD_REQUEST: 1002,
  VALIDATION_FAILED: 1003,
  UNAUTHORIZED: 1004,
  FORBIDDEN: 1005,
  NOT_FOUND: 1006,
  SERVER_ERROR: 1007,
} as const

export type ApiCode = (typeof API_CODE)[keyof typeof API_CODE]

/**
 * The one error type the UI has to understand. The mock backend throws it too,
 * so error handling written today keeps working against the real API.
 */
export class ApiError extends Error {
  code: ApiCode

  constructor(code: ApiCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Message safe to surface in a toast or inline error. */
export function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

interface Envelope<T> {
  responseCode: ApiCode
  responseMessage: string
  responseData: T
}

/**
 * Envelope-aware fetch. Unwraps `responseData` on success and throws an
 * `ApiError` carrying the app-level code on anything else.
 */
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new ApiError(API_CODE.SERVER_ERROR, "Can't reach the server. Check your connection.")
  }

  let envelope: Envelope<T>
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    throw new ApiError(API_CODE.SERVER_ERROR, 'The server returned an unreadable response.')
  }

  const { responseCode, responseMessage, responseData } = envelope

  if (responseCode !== API_CODE.SUCCESS && responseCode !== API_CODE.CREATED) {
    throw new ApiError(responseCode ?? API_CODE.SERVER_ERROR, responseMessage)
  }

  return responseData
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
