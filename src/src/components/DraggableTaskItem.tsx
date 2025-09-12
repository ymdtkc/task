import { useDrag } from 'react-dnd';
import { Task } from './TaskForm';
import { TaskItem } from './TaskItem';

interface DraggableTaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  showTodayToggle?: boolean;
  showDescription?: boolean;
  showImportanceUrgency?: boolean;
}

export function DraggableTaskItem({
  task,
  onToggleComplete,
  onToggleToday,
  onEdit,
  onDelete,
  showTodayToggle = true,
  showDescription = true,
  showImportanceUrgency = true
}: DraggableTaskItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { id: task.id, task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`transition-all duration-200 ${
        isDragging ? 'opacity-50 rotate-3 scale-105 cursor-grabbing' : 'cursor-grab hover:scale-102'
      }`}
    >
      <TaskItem
        task={task}
        onToggleComplete={onToggleComplete}
        onToggleToday={onToggleToday}
        onEdit={onEdit}
        onDelete={onDelete}
        showTodayToggle={showTodayToggle}
        showDescription={showDescription}
        showImportanceUrgency={showImportanceUrgency}
      />
    </div>
  );
}