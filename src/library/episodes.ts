/** Watched episode numbers per season. */
export type Episodes = Record<number, number[]>

export const countEpisodes = (episodes: Episodes) =>
  Object.values(episodes).reduce((total, numbers) => total + numbers.length, 0)

export function addEpisodes(base: Episodes, extra: Episodes): Episodes {
  const result = { ...base }
  for (const [season, numbers] of Object.entries(extra)) {
    const merged = new Set([...(result[Number(season)] ?? []), ...numbers])
    result[Number(season)] = [...merged].sort((a, b) => a - b)
  }
  return result
}

export function removeEpisodes(base: Episodes, gone: Episodes): Episodes {
  return Object.fromEntries(
    Object.entries(base).map(([season, numbers]) => [
      season,
      numbers.filter((n) => !gone[Number(season)]?.includes(n)),
    ]),
  )
}

/** Parses `next_to_watch` values such as `S02E07` or `E05` (anime: season 1). */
export function parseEpisodeCode(code: string): Episodes | null {
  const match = /^(?:S(\d+))?E(\d+)$/.exec(code)
  return match ? { [Number(match[1] ?? 1)]: [Number(match[2])] } : null
}

/** Simkl writes anime codes as `E5`; the app always shows two digits, as in `E05`. */
export const padEpisodeCode = (code: string) =>
  code.replace(/\d+/g, (number) => number.padStart(2, '0'))
