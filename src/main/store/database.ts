import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'nsty.db')
  db = new Database(dbPath)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  // Run migrations
  migrate(db)

  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      favicon_url TEXT,
      visit_count INTEGER DEFAULT 1,
      last_visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      space_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
    CREATE INDEX IF NOT EXISTS idx_history_visited ON history(last_visited_at);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      folder_id INTEGER REFERENCES bookmarks(id),
      space_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      model TEXT DEFAULT 'sonnet',
      page_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

    CREATE TABLE IF NOT EXISTS shield_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      ads_blocked INTEGER DEFAULT 0,
      trackers_blocked INTEGER DEFAULT 0,
      bytes_saved INTEGER DEFAULT 0,
      date DATE DEFAULT (date('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shield_domain_date ON shield_stats(domain, date);
  `)
}

// Shield stats operations
export function saveShieldStats(domain: string, adsBlocked: number, trackersBlocked: number, bytesSaved: number): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO shield_stats (domain, ads_blocked, trackers_blocked, bytes_saved, date)
    VALUES (?, ?, ?, ?, date('now'))
    ON CONFLICT(id) DO UPDATE SET
      ads_blocked = ads_blocked + excluded.ads_blocked,
      trackers_blocked = trackers_blocked + excluded.trackers_blocked,
      bytes_saved = bytes_saved + excluded.bytes_saved
  `)
  stmt.run(domain, adsBlocked, trackersBlocked, bytesSaved)
}

// History operations
export function addToHistory(url: string, title: string, faviconUrl: string, spaceId: string): void {
  const db = getDatabase()
  const existing = db.prepare('SELECT id, visit_count FROM history WHERE url = ?').get(url) as
    | { id: number; visit_count: number }
    | undefined

  if (existing) {
    db.prepare('UPDATE history SET title = ?, favicon_url = ?, visit_count = ?, last_visited_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(title, faviconUrl, existing.visit_count + 1, existing.id)
  } else {
    db.prepare('INSERT INTO history (url, title, favicon_url, space_id) VALUES (?, ?, ?, ?)')
      .run(url, title, faviconUrl, spaceId)
  }
}

export function searchHistory(query: string, limit = 20): unknown[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM history WHERE title LIKE ? OR url LIKE ? ORDER BY last_visited_at DESC LIMIT ?')
    .all(`%${query}%`, `%${query}%`, limit)
}

// Conversation operations
export function saveConversation(id: string, title: string, model: string, pageUrl: string | null): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO conversations (id, title, model, page_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = CURRENT_TIMESTAMP
  `).run(id, title, model, pageUrl)
}

export function saveMessage(conversationId: string, role: string, content: string, tokensUsed: number | null): void {
  const db = getDatabase()
  db.prepare('INSERT INTO messages (conversation_id, role, content, tokens_used) VALUES (?, ?, ?, ?)')
    .run(conversationId, role, content, tokensUsed)
}

export function getConversationMessages(conversationId: string): unknown[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
