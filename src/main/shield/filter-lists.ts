import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { createLogger } from '../utils/logger'

const log = createLogger('shield-filters')

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
      log.debug('filter list up to date', { name: list.name })
      continue
    }

    try {
      log.info('downloading filter list', { name: list.name })
      const response = await fetch(list.url)
      if (!response.ok) {
        log.warn('filter download failed', { name: list.name, status: response.status })
        continue
      }

      const text = await response.text()
      fs.writeFileSync(filePath, text, 'utf-8')

      meta[list.filename] = {
        lastUpdated: now,
        size: text.length,
      }

      log.info('filter list updated', { name: list.name, sizeKb: Math.round(text.length / 1024) })
    } catch (err) {
      log.warn('filter download error', { name: list.name, message: err instanceof Error ? err.message : String(err) })
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
  const handleError = (err: unknown): void => {
    log.error('scheduled filter update failed', { message: err instanceof Error ? err.message : String(err) })
  }
  // Update immediately on startup
  updateFilterLists().catch(handleError)

  // Then check every 24 hours
  setInterval(() => {
    updateFilterLists().catch(handleError)
  }, 86400000)
}
