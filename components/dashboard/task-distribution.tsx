import { TASK_STATUSES, type Task } from "@/types/task";
import { CategoricalBarList } from "@/components/shared/categorical-bar-list";
import { CATEGORICAL } from "@/lib/chart-colors";

export function TaskDistribution({ tasks }: { tasks: Task[] }) {
  const items = TASK_STATUSES.map((status, index) => ({
    label: status,
    value: tasks.filter((task) => task.status === status).length,
    color: CATEGORICAL[index],
  }));

  return <CategoricalBarList items={items} />;
}
