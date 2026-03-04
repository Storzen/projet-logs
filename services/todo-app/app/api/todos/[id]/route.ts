import { NextResponse } from "next/server";
import { toggleTodo, deleteTodo } from "@/lib/db";
import { log } from "@/lib/logger";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }
    const todo = await toggleTodo(numericId);
    log("INFO", "Todo mis à jour", { id: numericId, completed: todo.completed });
    return NextResponse.json(todo);
  } catch (err) {
    const { id } = await params;
    log("ERROR", "Impossible de mettre à jour le todo", {
      id: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }
    await deleteTodo(numericId);
    log("INFO", "Todo supprimé", { id: numericId });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const { id } = await params;
    log("ERROR", "Impossible de supprimer le todo", {
      id: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
