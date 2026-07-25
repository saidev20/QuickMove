import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, pointerWithin, rectIntersection, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent, useDroppable, type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, getPriorityColor, getCategoryLabel, getInitials, getDaysUntil } from '@/lib/utils';
import type { Task, KanbanData } from '@/types';

const COLUMNS: { key: keyof KanbanData; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'var(--text-tertiary)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--info)' },
  { key: 'waiting', label: 'Waiting', color: 'var(--warning)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--error)' },
  { key: 'completed', label: 'Completed', color: 'var(--success)' },
];

function TaskCard({
  task,
  isDragging,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  task: Task;
  isDragging?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  const daysUntil = getDaysUntil(task.due_date);

  return (
    <div
      className={cn(
        'kanban-card relative select-none cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-80 shadow-elevated ring-2 ring-[var(--accent)]',
        isSelected && 'ring-2 ring-[var(--accent)] bg-[var(--accent-light)]/20'
      )}
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(task.id)}
              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
            />
          )}
          <span className="text-xs text-tertiary">{getCategoryLabel(task.category)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`badge ${getPriorityColor(task.priority)} text-[10px]`}>{task.priority}</span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete task '${task.title}'?`)) {
                  onDelete(task.id);
                }
              }}
              className="text-tertiary hover:text-error transition-colors p-0.5"
              title="Delete task"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-primary mb-2 line-clamp-2">{task.title}</p>
      {task.customer_name && (
        <span className="text-xs text-accent mb-2 block font-medium">
          {task.customer_name}
        </span>
      )}
      <div className="flex items-center justify-between text-xs text-tertiary">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} />
          <span className={cn(daysUntil < 0 && task.status !== 'completed' && 'text-[var(--error)] font-medium')}>
            {formatDate(task.due_date)}
          </span>
        </div>
        {task.owner && (
          <div className="flex items-center gap-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {getInitials(task.owner)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  task: Task;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onDelete={onDelete}
      />
    </div>
  );
}

function KanbanColumnContainer({
  col,
  tasks,
  selectMode,
  selectedIds,
  onToggleSelect,
  onDeleteTask,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  selectMode: boolean;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onDeleteTask: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${col.key}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'kanban-column transition-colors min-h-[300px] flex flex-col',
        isOver && 'ring-2 ring-[var(--accent)] bg-[var(--accent-light)]/10'
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-sm font-semibold text-primary">{col.label}</span>
        </div>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-inset text-secondary">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map(t => `task-${t.id}`)}
        strategy={verticalListSortingStrategy}
        id={`column-${col.key}`}
      >
        <div className="space-y-2 flex-1 min-h-[150px]">
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              isSelected={selectMode && selectedIds.includes(task.id)}
              onToggleSelect={selectMode ? onToggleSelect : undefined}
              onDelete={onDeleteTask}
            />
          ))}
          {tasks.length === 0 && (
            <div className="h-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-subtle rounded-lg text-xs text-tertiary">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const params: Record<string, string> = {};
  if (categoryFilter) params.category = categoryFilter;
  if (ownerFilter) params.owner = ownerFilter;

  const { data: kanban, isLoading } = useQuery({
    queryKey: ['kanban', params],
    queryFn: () => api.tasks.kanban(Object.keys(params).length > 0 ? params : undefined),
  });

  const { data: executives } = useQuery({
    queryKey: ['executives'],
    queryFn: () => api.executives(),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.tasks.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.tasks.batchDelete(ids),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.tasks.deleteAll(),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      api.tasks.updateStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban'] });
      const previousKanban = queryClient.getQueryData<KanbanData>(['kanban', params]);

      if (previousKanban) {
        const nextKanban: KanbanData = { ...previousKanban };
        let movedTask: Task | null = null;

        for (const colKey of Object.keys(nextKanban) as (keyof KanbanData)[]) {
          const idx = nextKanban[colKey].findIndex(t => t.id === taskId);
          if (idx !== -1) {
            [movedTask] = nextKanban[colKey].splice(idx, 1);
            break;
          }
        }

        if (movedTask && status in nextKanban) {
          movedTask = { ...movedTask, status };
          nextKanban[status as keyof KanbanData].unshift(movedTask);
          queryClient.setQueryData(['kanban', params], nextKanban);
        }
      }

      return { previousKanban };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(['kanban', params], context.previousKanban);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const allTasks: Task[] = kanban ? Object.values(kanban).flat() : [];
  const allIds = allTasks.map(t => t.id);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(allIds);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.task) setActiveTask(data.task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id.toString();
    let newStatus = '';

    if (overId.startsWith('column-')) {
      newStatus = overId.replace('column-', '');
    } else if (overId.startsWith('task-')) {
      const overTaskId = parseInt(overId.replace('task-', ''));
      if (kanban) {
        for (const colKey of Object.keys(kanban) as (keyof KanbanData)[]) {
          if (kanban[colKey].some(t => t.id === overTaskId)) {
            newStatus = colKey;
            break;
          }
        }
      }
    }

    if (!newStatus) return;

    const taskId = parseInt(active.id.toString().replace('task-', ''));
    const activeTaskData = active.data.current?.task as Task | undefined;

    if (activeTaskData && activeTaskData.status !== newStatus) {
      updateStatusMutation.mutate({ taskId, status: newStatus });
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto">
            <option value="">All Categories</option>
            <option value="property_search">Property Search</option>
            <option value="moving">Moving</option>
            <option value="utilities">Utilities</option>
            <option value="documentation">Documentation</option>
            <option value="post_move">Post Move</option>
          </select>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="input w-auto">
            <option value="">All Owners</option>
            {executives?.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {(categoryFilter || ownerFilter) && (
            <button onClick={() => { setCategoryFilter(''); setOwnerFilter(''); }} className="btn btn-ghost btn-sm text-accent">
              Clear
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setSelectMode(!selectMode);
            if (selectMode) setSelectedIds([]);
          }}
          className={cn('btn btn-secondary gap-1.5 text-xs', selectMode && 'border-[var(--error)] text-[var(--error)] bg-error/10')}
        >
          <Trash2 size={14} />
          {selectMode ? 'Done Selecting' : 'Select & Delete Tasks'}
        </button>
      </div>

      {/* Selection & Batch Action Bar */}
      {selectMode && allTasks.length > 0 && (
        <div className="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-inset animate-slide-down">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-primary">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
            />
            Select All ({selectedIds.length}/{allTasks.length} tasks selected)
          </label>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} selected tasks?`)) {
                    batchDeleteMutation.mutate(selectedIds);
                  }
                }}
                className="btn btn-secondary btn-sm gap-1 text-error border-error/30 hover:bg-error/10"
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 size={13} />
                Delete Selected ({selectedIds.length})
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to DELETE ALL TASKS?")) {
                  deleteAllMutation.mutate();
                }
              }}
              className="btn btn-ghost btn-sm gap-1 text-error hover:bg-error/10"
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 size={13} />
              Delete All Tasks
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 -mx-2 px-2 custom-scrollbar">
          {COLUMNS.map(col => {
            const tasks = kanban?.[col.key] || [];
            return (
              <KanbanColumnContainer
                key={col.key}
                col={col}
                tasks={tasks}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 -mx-2 px-2 custom-scrollbar">
          {COLUMNS.map(col => (
            <div key={col.key} className="kanban-column animate-pulse">
              <div className="h-4 bg-inset rounded w-1/2 mb-4"></div>
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-3 space-y-2">
                  <div className="h-3 bg-inset rounded w-3/4"></div>
                  <div className="h-3 bg-inset rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
