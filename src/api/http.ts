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
  let isJson = true
  const body = await response.json().catch(() => {
    isJson = false
    return null
  })
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : 'http_error'
    const message =
      body?.error_description ?? body?.message ?? `Request failed (${response.status})`
    throw new ApiError(response.status, code, message)
  }
  // A broken body must never look like an empty result: sync would delete data.
  if (!isJson) throw new ApiError(response.status, 'invalid_json', 'Unreadable server response')
  return body as T
}
