import fs from 'node:fs/promises'
import path from 'node:path'

const SETTINGS_DIR = path.resolve(process.cwd(), 'storage', 'user-settings')

async function ensureDir() {
  await fs.mkdir(SETTINGS_DIR, { recursive: true })
}

function filePathFor(userId: string) {
  return path.join(SETTINGS_DIR, `${userId}.json`)
}

export async function readUserSettings(userId: string): Promise<unknown | null> {
  try {
    const p = filePathFor(userId)
    const raw = await fs.readFile(p, 'utf-8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function writeUserSettings(userId: string, data: unknown) {
  await ensureDir()
  const p = filePathFor(userId)
  const tmp = `${p}.${Date.now()}.tmp`
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(tmp, payload, 'utf-8')
  await fs.rename(tmp, p)
}


