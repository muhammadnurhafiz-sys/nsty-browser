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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PinnedPage } from '@shared/types'

interface PinnedPagesProps {
  pages: PinnedPage[]
  onReorder: (pages: PinnedPage[]) => void
  onUnpin: (url: string) => void
  onOpenInNewTab: (url: string) => void
  onClickPin: (url: string) => void
}

export function PinnedPages({ pages, onReorder, onUnpin, onOpenInNewTab, onClickPin }: PinnedPagesProps) {
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
    <div className="py-2">
      <div
        className="font-label text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 flex items-center gap-1.5"
        style={{ color: 'var(--outline)' }}
      >
        <span className="material-symbols-outlined text-[12px]">push_pin</span>
        Pinned
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map(p => p.url)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5">
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
    background: 'rgba(206, 250, 5, 0.06)',
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
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
      onClick={() => onClick(page.url)}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => onOpenInNewTab(page.url)}
    >
      {page.faviconUrl ? (
        <img src={page.faviconUrl} className="w-4 h-4 rounded-sm" alt="" />
      ) : (
        <div
          className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold"
          style={{ background: 'var(--surface-container-highest)', color: 'var(--primary)' }}
        >
          {page.title.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-body text-xs truncate" style={{ color: 'var(--on-surface)' }}>
        {page.title}
      </span>
    </div>
  )
}
