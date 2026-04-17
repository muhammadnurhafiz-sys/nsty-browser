import type { BrowserView } from 'electron'

const MAX_CONTEXT_LENGTH = 32000 // ~8000 tokens

export async function extractPageContext(view: BrowserView | null): Promise<string | null> {
  if (!view) return null

  try {
    const text = await view.webContents.executeJavaScript(`
      (function() {
        // Get main content text, avoiding nav/footer/sidebar noise
        const main = document.querySelector('main, article, [role="main"], #content, .content');
        const target = main || document.body;

        // Get text content, clean up whitespace
        let text = target.innerText || '';
        text = text.replace(/\\n{3,}/g, '\\n\\n').trim();
        return text;
      })()
    `)

    if (!text || typeof text !== 'string') return null

    // Truncate to max context length
    if (text.length > MAX_CONTEXT_LENGTH) {
      return `${text.slice(0, MAX_CONTEXT_LENGTH)}\n\n[Content truncated...]`
    }

    return text
  } catch {
    return null
  }
}

export async function extractSelectedText(view: BrowserView | null): Promise<string | null> {
  if (!view) return null

  try {
    const text = await view.webContents.executeJavaScript(`
      window.getSelection().toString()
    `)

    if (!text || typeof text !== 'string' || text.trim().length === 0) return null
    return text.trim()
  } catch {
    return null
  }
}
