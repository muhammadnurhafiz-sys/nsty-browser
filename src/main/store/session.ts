import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

interface SessionData {
  activeSpaceId: string
  sidebarExpanded: boolean
  windowBounds: { x: number; y: number; width: number; height: number } | null
  spaces: SpaceSession[]
}

interface SpaceSession {
  id: string
  tabs: TabSession[]
}

interface TabSession {
  url: string
  title: string
  spaceId: string
}

const DEFAULTS: SessionData = {
  activeSpaceId: 'work',
  sidebarExpanded: true,
  windowBounds: null,
  spaces: [],
}

function getSessionPath(): string {
  return path.join(app.getPath('userData'), 'session.json')
}

export function saveSession(data: Partial<SessionData>): void {
  const current = loadSession()
  const merged = { ...current, ...data }
  fs.writeFileSync(getSessionPath(), JSON.stringify(merged, null, 2), 'utf-8')
}

export function loadSession(): SessionData {
  try {
    const raw = fs.readFileSync(getSessionPath(), 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  saveSession({ windowBounds: bounds })
}

export function loadWindowBounds() {
  return loadSession().windowBounds
}
