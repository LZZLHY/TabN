import fs from 'node:fs/promises'
import path from 'node:path'

const STORAGE_DIR = path.resolve(process.cwd(), 'storage')
const FILE_PATH = path.join(STORAGE_DIR, 'project-settings.json')

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true })
}

export async function readProjectSettings(): Promise<unknown> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8')
    return JSON.parse(raw) as unknown
  } catch {
    return { version: 1 }
  }
}

export async function writeProjectSettings(data: unknown) {
  await ensureDir()
  const tmp = `${FILE_PATH}.${Date.now()}.tmp`
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(tmp, payload, 'utf-8')
  await fs.rename(tmp, FILE_PATH)
}


