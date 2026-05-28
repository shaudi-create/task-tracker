export const PROJECTS_UPDATED = "projects-updated";
export const TASKS_UPDATED = "tasks-updated";

export function notifyProjectsUpdated() {
  window.dispatchEvent(new Event(PROJECTS_UPDATED));
}

export function notifyTasksUpdated() {
  window.dispatchEvent(new Event(TASKS_UPDATED));
}
