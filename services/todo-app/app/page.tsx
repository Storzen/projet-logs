import { TodoList } from "@/components/todo-list";
import { Todo, getTodos } from "@/lib/db";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function Home() {
  let todos: Todo[] = [];
  try {
    todos = await getTodos();
    log("INFO", "Page chargée", { count: todos.length });
  } catch (err) {
    log("ERROR", "Erreur lors du chargement de la page", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Mes tâches</h1>
      </div>
      <TodoList initialTodos={todos} />
    </main>
  );
}
