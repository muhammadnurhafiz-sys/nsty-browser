import type { Space } from '@shared/types'

interface SpaceSwitcherProps {
  spaces: Space[]
  activeSpaceId: string
  onSwitchSpace: (spaceId: string) => void
}

export function SpaceSwitcher({ spaces, activeSpaceId, onSwitchSpace }: SpaceSwitcherProps) {
  return (
    <div className="flex gap-1 px-2.5 pb-2">
      {spaces.map(space => (
        <button
          key={space.id}
          onClick={() => onSwitchSpace(space.id)}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors"
          style={{
            background: space.id === activeSpaceId ? space.color : 'var(--bg-hover)',
            color: space.id === activeSpaceId ? 'white' : 'var(--text-secondary)',
          }}
        >
          {space.name}
        </button>
      ))}
    </div>
  )
}
