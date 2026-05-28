import { Suspense } from "react";
import { TasksView } from "@/components/TasksView";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksView />
    </Suspense>
  );
}
