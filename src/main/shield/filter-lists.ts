import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const FILTER_LISTS = [
  {
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    filename: 'easylist.txt',
  },
  {
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    filename: 'easyprivacy.txt',
  },
  {
    name: 'uBlock Filters',
    url: 'https://raw.githubusercontent.com/nicedoc/ublock-origin-filters/master/filters.txt',
    filename: 'ublock-filters.txt',
  },
]

function getFilterDir(): string {
  const dir = path.join(app.getPath('userData'), 'filter-lists')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getMetaPath(): string {
  return path.join(getFilterDir(), 'meta.json')
}

interface FilterMeta {
  [filename: string]: {
    lastUpdated: number
    size: number
  }
}

function loadMeta(): FilterMeta {
  try {
    return JSON.parse(fs.readFileSync(getMetaPath(), 'utf-8'))
  } catch {
    return {}
  }
}

function saveMeta(meta: FilterMeta): void {
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8')
}

export async function updateFilterLists(): Promise<void> {
  const dir = getFilterDir()
  const meta = loadMeta()
  const now = Date.now()
  const ONE_DAY = 86400000

  for (const list of FILTER_LISTS) {
    const filePath = path.join(dir, list.filename)
    const existing = meta[list.filename]

    // Skip if updated within last 24 hours
    if (existing && now - existing.lastUpdated < ONE_DAY && fs.existsSync(filePath)) {
      console.log(`[Shield] ${list.name} is up to date`)
      continue
    }

    try {
      console.log(`[Shield] Downloading ${list.name}...`)
      const response = await fetch(list.url)
      if (!response.ok) {
        console.warn(`[Shield] Failed to download ${list.name}: ${response.status}`)
        continue
      }

      const text = await response.text()
      fs.writeFileSync(filePath, text, 'utf-8')

      meta[list.filename] = {
        lastUpdated: now,
        size: text.length,
      }

      console.log(`[Shield] Updated ${list.name} (${(text.length / 1024).toFixed(0)} KB)`)
    } catch (err) {
      console.warn(`[Shield] Error downloading ${list.name}:`, err)
    }
  }

  saveMeta(meta)
}

export function getFilterListPaths(): string[] {
  const dir = getFilterDir()
  return FILTER_LISTS
    .map(l => path.join(dir, l.filename))
    .filter(p => fs.existsSync(p))
}

export function scheduleFilterUpdates(): void {
  // Update immediately on startup
  updateFilterLists().catch(console.error)

  // Then check every 24 hours
  setInterval(() => {
    updateFilterLists().catch(console.error)
  }, 86400000)
}
