import PocketBase from 'pocketbase'

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL

export const pb = new PocketBase(POCKETBASE_URL)

export async function restoreAuth(): Promise<boolean> {
  if (!pb.authStore.isValid) return false
  try {
    await pb.collection('users').authRefresh()
    return pb.authStore.isValid
  } catch {
    pb.authStore.clear()
    return false
  }
}
