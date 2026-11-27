const NAMED: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' }

const toChar = (match: string, name: string) => {
  if (name[0] !== '#') return NAMED[name] ?? match
  const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
  return code <= 0x10ffff ? String.fromCodePoint(code) : match
}

/** Some Simkl texts carry HTML entities, for example `JoJo&#039;s`. */
export const decodeEntities = (text: string) =>
  text.includes('&') ? text.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, toChar) : text

/** Decodes every text of a JSON value. */
export function decodeDeep<T>(value: T): T {
  if (typeof value === 'string') return decodeEntities(value) as T
  if (Array.isArray(value)) return value.map(decodeDeep) as T
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, decodeDeep(entry)]),
  ) as T
}
