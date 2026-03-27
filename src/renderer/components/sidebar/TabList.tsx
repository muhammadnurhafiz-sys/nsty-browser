import type { Tab } from '@shared/types'
import { TabItem } from './TabItem'

interface TabListProps {
  tabs: Tab[]
  activeTabId: string | null
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onPinTab: (tab: Tab) => void
}

type TabGroup = {
  label: string
  tabs: Tab[]
}

function groupTabsByDay(tabs: Tab[]): TabGroup[] {
  const now = Date.now()
  const today = new Date().setHours(0, 0, 0, 0)
  const yesterday = today - 86400000

  const groups: Record<string, Tab[]> = {
    Today: [],
    Yesterday: [],
    Older: [],
  }

  for (const tab of tabs) {
    if (tab.createdAt >= today) {
      groups.Today.push(tab)
    } else if (tab.createdAt >= yesterday) {
      groups.Yesterday.push(tab)
    } else {
      groups.Older.push(tab)
    }
  }

  return Object.entries(groups)
    .filter(([, tabs]) => tabs.length > 0)
    .map(([label, tabs]) => ({ label, tabs }))
}

export function TabList({ tabs, activeTabId, onSwitchTab, onCloseTab, onPinTab }: TabListProps) {
  const groups = groupTabsByDay(tabs)

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
          No open tabs in this space
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
      {groups.map(group => (
        <div key={group.label}>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5 pt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.tabs.map(tab => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSwitch={onSwitchTab}
                onClose={onCloseTab}
                onPin={onPinTab}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
