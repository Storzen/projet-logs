"use client";

import type { Todo } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useRef, useState, useTransition } from "react";

type OptimisticTodo = Todo & { pending?: boolean };

type Action =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: number }
  | { type: "delete"; id: number };

function todosReducer(
  state: OptimisticTodo[],
  action: Action,
): OptimisticTodo[] {
  switch (action.type) {
    case "add":
      return [{ ...action.todo, pending: true }, ...state];
    case "toggle":
      return state.map((t) =>
        t.id === action.id
          ? { ...t, completed: !t.completed, pending: true }
          : t,
      );
    case "delete":
      return state.filter((t) => t.id !== action.id);
  }
}

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<OptimisticTodo[]>(initialTodos);
  const [optimisticTodos, dispatchOptimistic] = useOptimistic(
    todos,
    todosReducer,
  );
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = optimisticTodos.length;

  async function handleAdd() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    setError(null);

    const tempTodo: Todo = {
      id: -Date.now(),
      text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    startTransition(async () => {
      dispatchOptimistic({ type: "add", todo: tempTodo });
      try {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("Erreur lors de la création");
        const newTodo: Todo = await res.json();
        // Remplace le todo optimiste par la vraie réponse serveur
        setTodos((prev) => [newTodo, ...prev]);
      } catch {
        setError("Impossible d'ajouter la tâche. Réessaie.");
        setTodos((prev) => prev.filter((t) => t.id !== tempTodo.id)); // rollback
      }
    });

    inputRef.current?.focus();
  }

  async function handleToggle(id: number) {
    setError(null);
    startTransition(async () => {
      dispatchOptimistic({ type: "toggle", id });
      try {
        const res = await fetch(`/api/todos/${id}`, { method: "PATCH" });
        if (!res.ok) throw new Error("Erreur lors de la mise à jour");
        const updated: Todo = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch {
        setError("Impossible de mettre à jour la tâche.");
        setTodos((prev) => prev);
      }
    });
  }

  async function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      dispatchOptimistic({ type: "delete", id });
      try {
        const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Erreur lors de la suppression");
        setTodos((prev) => prev.filter((t) => t.id !== id));
      } catch {
        setError("Impossible de supprimer la tâche.");
        setTodos((prev) => prev);
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="-mt-9 text-sm text-zinc-500 dark:text-zinc-400">
        {totalCount} tâche{totalCount !== 1 ? "s" : ""}
      </p>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nouvelle tâche…"
          className={cn(
            "flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5",
            "dark:border-zinc-700 dark:bg-zinc-900",
            "text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            "transition-colors",
          )}
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim() || isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-zinc-200 px-4 py-2.5",
            "dark:bg-zinc-700 dark:text-zinc-100",
            "text-sm font-medium text-zinc-800",
            "hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Ajouter
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {optimisticTodos.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">
            Aucune tâche. Ajoutez-en une !
          </li>
        )}
        {optimisticTodos.map((todo) => (
          <li
            key={todo.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3",
              "dark:border-zinc-800 dark:bg-zinc-900",
              "shadow-sm dark:shadow-none",
              "transition-opacity",
              todo.pending && "opacity-60",
            )}
          >
            <button
              onClick={() => handleToggle(todo.id)}
              disabled={todo.pending}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                "border-2 transition-colors",
                todo.completed
                  ? "border-zinc-500 bg-zinc-500 dark:border-zinc-400 dark:bg-zinc-400"
                  : "border-zinc-400 hover:border-zinc-600 dark:border-zinc-600 dark:hover:border-zinc-400",
              )}
              aria-label="Marquer comme terminé"
            >
              {todo.completed && (
                <svg
                  className="h-3 w-3 text-white dark:text-zinc-900"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    d="M2 6l3 3 5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <span
              className={cn(
                "flex-1 text-sm text-zinc-800 dark:text-zinc-100",
                todo.completed &&
                  "text-zinc-400 dark:text-zinc-500 line-through",
              )}
            >
              {todo.text}
            </span>

            {todo.pending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400 dark:text-zinc-500" />
            )}

            <button
              onClick={() => handleDelete(todo.id)}
              disabled={todo.pending}
              className={cn(
                "rounded p-1 text-zinc-400 dark:text-zinc-600",
                "hover:text-red-500 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-950 transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
              aria-label="Supprimer la tâche"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {optimisticTodos.length > 0 && (
        <p className="text-right text-xs text-zinc-500 dark:text-zinc-600">
          {optimisticTodos.filter((t) => t.completed).length} /{" "}
          {optimisticTodos.length} complétées
        </p>
      )}
    </div>
  );
}
