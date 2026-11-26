export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : 'http_error'
    const message =
      body?.error_description ?? body?.message ?? `Request failed (${response.status})`
    throw new ApiError(response.status, code, message)
  }
  return body as T
}
