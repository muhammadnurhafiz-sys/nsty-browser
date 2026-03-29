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
        <div className="text-center">
          <span
            className="material-symbols-outlined mb-2 block"
            style={{ fontSize: 24, color: 'var(--outline)', opacity: 0.4 }}
          >
            tab
          </span>
          <p className="font-body text-[11px]" style={{ color: 'var(--outline)' }}>
            No open tabs in this space
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar py-1">
      {groups.map(group => (
        <div key={group.label} className="mb-2">
          <div
            className="font-label text-[10px] uppercase px-3 pb-1 pt-1"
            style={{ color: 'rgba(206, 250, 5, 0.35)', letterSpacing: '0.12em' }}
          >
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5 px-1">
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
