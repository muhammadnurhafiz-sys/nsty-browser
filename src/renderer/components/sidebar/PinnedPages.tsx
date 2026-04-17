import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PinnedPage } from '@shared/types'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { createLogger } from '../../utils/logger'

const log = createLogger('PinnedPages')

interface PinnedPagesProps {
  pages: PinnedPage[]
  onReorder: (pages: PinnedPage[]) => void
  onUnpin: (url: string) => void
  onOpenInNewTab: (url: string) => void
  onClickPin: (url: string) => void
  isExpanded: boolean
}

export function PinnedPages({ pages, onReorder, onUnpin, onOpenInNewTab, onClickPin, isExpanded }: PinnedPagesProps) {
  log.debug('render', { count: pages.length, isExpanded })
  const [pendingUnpin, setPendingUnpin] = useState<PinnedPage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (pages.length === 0) return null

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pages.findIndex(p => p.url === active.id)
    const newIndex = pages.findIndex(p => p.url === over.id)
    const reordered = arrayMove(pages, oldIndex, newIndex).map((p, i) => ({ ...p, order: i }))
    log.debug('reordered pins', { from: oldIndex, to: newIndex })
    onReorder(reordered)
  }

  const confirmUnpin = (): void => {
    if (pendingUnpin) {
      log.info('unpinning', { url: pendingUnpin.url })
      onUnpin(pendingUnpin.url)
    }
    setPendingUnpin(null)
  }

  return (
    <div className="py-1">
      {isExpanded && (
        <div
          className="font-label text-[10px] uppercase px-3 pb-2"
          style={{ color: 'rgba(var(--primary-rgb), 0.35)', letterSpacing: '0.12em' }}
        >
          Pinned
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map(p => p.url)} strategy={rectSortingStrategy}>
          <div className={`flex gap-1.5 flex-wrap ${isExpanded ? 'px-3' : 'flex-col items-center px-0'}`} style={{ padding: isExpanded ? undefined : '0 8px' }}>
            {pages.map(page => (
              <SortablePinItem
                key={page.url}
                page={page}
                onRequestUnpin={setPendingUnpin}
                onOpenInNewTab={onOpenInNewTab}
                onClick={onClickPin}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ConfirmDialog
        isOpen={pendingUnpin !== null}
        title={pendingUnpin ? `Unpin "${pendingUnpin.title}"?` : ''}
        message="This will remove it from your sidebar. You can re-pin it from the tab's context menu."
        confirmLabel="Unpin"
        cancelLabel="Keep"
        tone="danger"
        onConfirm={confirmUnpin}
        onCancel={() => setPendingUnpin(null)}
      />
    </div>
  )
}

function SortablePinItem({
  page,
  onRequestUnpin,
  onOpenInNewTab,
  onClick,
}: {
  page: PinnedPage
  onRequestUnpin: (page: PinnedPage) => void
  onOpenInNewTab: (url: string) => void
  onClick: (url: string) => void
}) {
  log.debug('render pin item', { url: page.url })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.url,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    onRequestUnpin(page)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-8 h-8 rounded-lg cursor-pointer transition-colors flex items-center justify-center"
      onClick={() => onClick(page.url)}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => onOpenInNewTab(page.url)}
      title={page.title}
    >
      {page.faviconUrl ? (
        <img src={page.faviconUrl} className="w-5 h-5 rounded" alt={page.title} />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
          style={{ background: 'var(--surface-translucent-hover)', border: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)' }}
        >
          {page.title.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
