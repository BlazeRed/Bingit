import { ApiError, readJson } from './http'

interface GraphQlResponse<T> {
  data: T
  errors?: { message: string }[]
}

/** AniList GraphQL query. Public reads need no key. */
export async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const { data, errors } = await readJson<GraphQlResponse<T>>(response)
  if (errors?.[0]) throw new ApiError(response.status, 'graphql_error', errors[0].message)
  return data
}
