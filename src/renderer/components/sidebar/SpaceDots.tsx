import type { Space } from '@shared/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('SpaceDots')

interface SpaceDotsProps {
  spaces: Space[]
  activeSpaceId: string
  onSwitchSpace: (spaceId: string) => void
}

const SPACE_GRADIENTS: Record<string, string> = {
  work: 'linear-gradient(135deg, #1a3a0a, #2d5a1a)',
  personal: 'linear-gradient(135deg, #0a2a1a, #1a4a3a)',
  dev: 'linear-gradient(135deg, #1a2a0a, #3a4a0a)',
}

const GRADIENT_FALLBACKS = Object.values(SPACE_GRADIENTS)

function getSpaceGradient(space: Space, index: number): string {
  const gradient = SPACE_GRADIENTS[space.id] ?? GRADIENT_FALLBACKS[index % GRADIENT_FALLBACKS.length] ?? GRADIENT_FALLBACKS[0]!
  log.debug('gradient', { id: space.id, gradient })
  return gradient
}

// Workspace dots — always horizontal. Arc-style minimal indicator of which
// space the user is in, positioned at the top of the sidebar so it doesn't
// steal vertical space from the tab list.
export function SpaceDots({ spaces, activeSpaceId, onSwitchSpace }: SpaceDotsProps) {
  log.debug('render', { count: spaces.length, activeSpaceId })
  return (
    <div className="flex flex-row items-center gap-2">
      {spaces.map((space, i) => {
        const isActive = space.id === activeSpaceId
        return (
          <button
            type="button"
            key={space.id}
            onClick={() => onSwitchSpace(space.id)}
            className="rounded-full cursor-pointer transition-[opacity,border-color,transform] duration-150 ease-out hover:opacity-90"
            style={{
              width: isActive ? 14 : 10,
              height: isActive ? 14 : 10,
              background: getSpaceGradient(space, i),
              opacity: isActive ? 1 : 0.5,
              border: isActive ? '2px solid rgba(var(--primary-rgb), 0.5)' : '1px solid transparent',
            }}
            aria-label={`Switch to ${space.name} space`}
            aria-current={isActive ? 'true' : undefined}
            title={space.name}
          />
        )
      })}
    </div>
  )
}
