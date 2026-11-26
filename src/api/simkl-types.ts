/** Hand-written, only the fields the app reads. */
export interface SimklUserSettings {
  user: { name: string; avatar: string }
  account: { id: number; type: string }
}
