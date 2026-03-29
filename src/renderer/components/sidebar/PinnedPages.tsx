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

interface PinnedPagesProps {
  pages: PinnedPage[]
  onReorder: (pages: PinnedPage[]) => void
  onUnpin: (url: string) => void
  onOpenInNewTab: (url: string) => void
  onClickPin: (url: string) => void
  isExpanded: boolean
}

export function PinnedPages({ pages, onReorder, onUnpin, onOpenInNewTab, onClickPin, isExpanded }: PinnedPagesProps) {
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
    onReorder(reordered)
  }

  return (
    <div className="py-1">
      {isExpanded && (
        <div
          className="font-label text-[10px] uppercase px-3 pb-2"
          style={{ color: 'rgba(206, 250, 5, 0.35)', letterSpacing: '0.12em' }}
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
                onUnpin={onUnpin}
                onOpenInNewTab={onOpenInNewTab}
                onClick={onClickPin}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortablePinItem({
  page,
  onUnpin,
  onOpenInNewTab,
  onClick,
}: {
  page: PinnedPage
  onUnpin: (url: string) => void
  onOpenInNewTab: (url: string) => void
  onClick: (url: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.url,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const choice = window.confirm(`Unpin "${page.title}"?`)
    if (choice) onUnpin(page.url)
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
