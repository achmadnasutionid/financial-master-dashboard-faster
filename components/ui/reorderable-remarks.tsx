"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Remark {
  id: string
  text: string
  isCompleted: boolean
}

interface ReorderableRemarksProps {
  remarks: Remark[]
  onRemarksChange: (remarks: Remark[]) => void
  onUpdateRemark: (id: string, text: string) => void
  onToggleRemark: (id: string) => void
  onRemoveRemark: (id: string) => void
}

function SortableRemark({
  remark,
  onUpdate,
  onToggle,
  onRemove,
}: {
  remark: Remark
  onUpdate: (text: string) => void
  onToggle: () => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: remark.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 mb-2"
    >
      <button
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </button>
      <input
        type="checkbox"
        checked={remark.isCompleted}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer"
      />
      <Input
        value={remark.text}
        onChange={(e) => onUpdate(e.target.value)}
        className={remark.isCompleted ? "line-through flex-1" : "flex-1"}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        Remove
      </Button>
    </div>
  )
}

export function ReorderableRemarks({
  remarks,
  onRemarksChange,
  onUpdateRemark,
  onToggleRemark,
  onRemoveRemark,
}: ReorderableRemarksProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = remarks.findIndex((r) => r.id === active.id)
      const newIndex = remarks.findIndex((r) => r.id === over.id)
      const newRemarks = arrayMove(remarks, oldIndex, newIndex)
      onRemarksChange(newRemarks)
    }
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={remarks.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {remarks.map((remark) => (
            <SortableRemark
              key={remark.id}
              remark={remark}
              onUpdate={(text) => onUpdateRemark(remark.id, text)}
              onToggle={() => onToggleRemark(remark.id)}
              onRemove={() => onRemoveRemark(remark.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
