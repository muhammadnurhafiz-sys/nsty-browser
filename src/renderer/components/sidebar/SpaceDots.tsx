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
  return SPACE_GRADIENTS[space.id] ?? GRADIENT_FALLBACKS[index % GRADIENT_FALLBACKS.length] ?? GRADIENT_FALLBACKS[0]!
}

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
            className="rounded-full cursor-pointer transition-[opacity,border-color] duration-150 ease-out hover:opacity-90"
            style={{
              width: 12,
              height: 12,
              background: getSpaceGradient(space, i),
              opacity: isActive ? 1 : 0.45,
              border: isActive ? '2px solid rgba(var(--primary-rgb), 0.55)' : '2px solid transparent',
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
