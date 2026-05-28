import { revalidatePath } from "next/cache";

export function revalidateTaskViews() {
  revalidatePath("/tasks");
  revalidatePath("/week");
}
