import { Card } from "@/components/antd/card";
import { TaskCheckItem } from "@/components/atoms/k/TaskCheckItem";

export interface Task {
  id: string;
  label: string;
  checked: boolean;
}

interface QuickTasksSectionProps {
  tasks: Task[];
  onTaskToggle: (id: string, checked: boolean) => void;
}

export function QuickTasksSection({
  tasks,
  onTaskToggle,
}: QuickTasksSectionProps) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Nhiệm vụ nhanh
      </h2>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCheckItem
            key={task.id}
            id={task.id}
            label={task.label}
            checked={task.checked}
            onCheckedChange={(checked) => onTaskToggle(task.id, checked)}
          />
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Không có nhiệm vụ nào</p>
        </div>
      )}
    </Card>
  );
}
