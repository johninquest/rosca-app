import PocketBase from 'pocketbase'
import { db } from '../db/dexie'

const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL // || 'https://pocketbaese.johnxlabs.de'

export const pb = new PocketBase(POCKETBASE_URL)

pb.authStore.onChange(async (token, model) => {
  const current = await db.settings.get('settings')
  await db.settings.put({
    id: 'settings',
    language: current?.language || 'fr',
    lastSyncAt: current?.lastSyncAt,
    adminEmail: model?.email,
    pbToken: token,
  })
})

export async function restoreAuth(): Promise<boolean> {
  const settings = await db.settings.get('settings')
  if (!settings?.pbToken) {
    return false
  }

  pb.authStore.save(settings.pbToken, null)
  try {
    await pb.collection('users').authRefresh()
    return pb.authStore.isValid
  } catch {
    pb.authStore.clear()
    return false
  }
}
