import type { Space } from '@shared/types'

interface SpaceDotsProps {
  spaces: Space[]
  activeSpaceId: string
  onSwitchSpace: (spaceId: string) => void
  isExpanded: boolean
}

const SPACE_GRADIENTS: Record<string, string> = {
  work: 'linear-gradient(135deg, #1a3a0a, #2d5a1a)',
  personal: 'linear-gradient(135deg, #0a2a1a, #1a4a3a)',
  dev: 'linear-gradient(135deg, #1a2a0a, #3a4a0a)',
}

const GRADIENT_FALLBACKS = Object.values(SPACE_GRADIENTS)

function getSpaceGradient(space: Space, index: number): string {
  return SPACE_GRADIENTS[space.id] ?? GRADIENT_FALLBACKS[index % GRADIENT_FALLBACKS.length] ?? GRADIENT_FALLBACKS[0]!
}

export function SpaceDots({ spaces, activeSpaceId, onSwitchSpace, isExpanded }: SpaceDotsProps) {
  return (
    <div className={`flex items-center gap-2 ${isExpanded ? '' : 'flex-col'}`}>
      {spaces.map((space, i) => {
        const isActive = space.id === activeSpaceId
        return (
          <button
            key={space.id}
            onClick={() => onSwitchSpace(space.id)}
            className="rounded-full cursor-pointer transition-all"
            style={{
              width: 20,
              height: 20,
              background: getSpaceGradient(space, i),
              opacity: isActive ? 1 : 0.4,
              border: isActive ? '2px solid rgba(206, 250, 5, 0.4)' : '2px solid transparent',
            }}
            aria-label={`Switch to ${space.name} space`}
            title={space.name}
          />
        )
      })}
      <button
        className="rounded-full cursor-pointer flex items-center justify-center transition-colors"
        style={{
          width: 14,
          height: 14,
          border: '1px dashed rgba(206, 250, 5, 0.2)',
          background: 'transparent',
          color: 'rgba(206, 250, 5, 0.3)',
          fontSize: 8,
        }}
        onClick={() => { /* Space creation not yet implemented */ }}
        aria-label="Create new space"
        title="New space (coming soon)"
      >
        +
      </button>
    </div>
  )
}
