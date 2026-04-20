/** Resolve an address-bar value to a navigation URL.
 *  - plain domain / URL → normalized https URL
 *  - free-form text → Google search URL */
export function resolveNavigation(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const isUrl = trimmed.includes('.') && !trimmed.includes(' ')
  if (isUrl && !trimmed.startsWith('http')) return `https://${trimmed}`
  if (isUrl) return trimmed
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}
