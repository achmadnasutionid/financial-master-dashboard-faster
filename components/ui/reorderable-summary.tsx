"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit2, Check, GripVertical } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SummaryItem {
  id: string
  label: string
  value: string
  note?: string
}

interface ReorderableSummaryProps {
  items: SummaryItem[]
  onReorder: (newOrder: string[]) => void
}

function SortableSummaryItem({ item }: { item: SummaryItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card p-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <div>
          <div className="font-medium">{item.label}</div>
          {item.note && (
            <div className="text-xs text-muted-foreground mt-1">{item.note}</div>
          )}
        </div>
        <div className="font-semibold">{item.value}</div>
      </div>
    </div>
  )
}

export function ReorderableSummary({ items, onReorder }: ReorderableSummaryProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [sortedItems, setSortedItems] = useState(items)
  const containerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setSortedItems(items)
  }, [items])

  // Click outside handler
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleSave()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isEditing, sortedItems])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSortedItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = () => {
    setIsEditing(false)
    onReorder(sortedItems.map(item => item.id))
  }

  const handleToggleEdit = () => {
    if (isEditing) {
      handleSave()
    } else {
      setIsEditing(true)
    }
  }

  return (
    <div ref={containerRef} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Summary</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggleEdit}
        >
          {isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Edit2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedItems.map((item) => (
                <SortableSummaryItem key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item, index) => (
            <div key={item.id}>
              {index === 2 && (
                <div className="border-t pt-2 mb-2" />
              )}
              <div className={`flex justify-between ${index === 2 ? 'text-base font-bold' : 'text-sm'}`}>
                <div>
                  <span>{item.label}:</span>
                  {item.note && (
                    <div className="text-xs font-bold mt-1 text-muted-foreground">
                      {item.note}
                    </div>
                  )}
                </div>
                <span className={`font-medium ${index === 2 ? 'text-primary' : item.id === 'pph' ? 'text-green-600' : ''}`}>
                  {item.id === 'pph' && '+ '}{item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
