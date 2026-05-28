export const PROJECTS_UPDATED = "projects-updated";

export function notifyProjectsUpdated() {
  window.dispatchEvent(new Event(PROJECTS_UPDATED));
}
