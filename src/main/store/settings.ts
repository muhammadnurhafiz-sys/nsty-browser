import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

interface Settings {
  sidebarDefaultExpanded: boolean
  aiDefaultModel: 'sonnet' | 'haiku' | 'opus'
  shieldEnabled: boolean
  tabAutoArchiveHours: number
  encryptedApiKey: string | null
}

const DEFAULTS: Settings = {
  sidebarDefaultExpanded: true,
  aiDefaultModel: 'sonnet',
  shieldEnabled: true,
  tabAutoArchiveHours: 12,
  encryptedApiKey: null,
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function readAll(): Settings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeAll(settings: Settings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  return readAll()[key]
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const current = readAll()
  current[key] = value
  writeAll(current)
}

export function getAllSettings(): Settings {
  return readAll()
}
