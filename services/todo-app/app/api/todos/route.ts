import { NextResponse } from "next/server";
import { getTodos, createTodo } from "@/lib/db";
import { log } from "@/lib/logger";

export async function GET() {
  try {
    const todos = await getTodos();
    log("INFO", "Todos récupérés", { count: todos.length });
    return NextResponse.json(todos);
  } catch (err) {
    log("ERROR", "Impossible de récupérer les todos", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim() === "") {
      log("WARN", "Tentative de création d'un todo vide");
      return NextResponse.json({ error: "Le texte est requis" }, { status: 400 });
    }
    const todo = await createTodo(text.trim());
    log("INFO", "Todo créé", { id: todo.id, text: todo.text });
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    log("ERROR", "Impossible de créer le todo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
