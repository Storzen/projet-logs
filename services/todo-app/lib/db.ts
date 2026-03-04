import { Pool } from "pg";
import { log } from "./logger";

// Pool de connexions partagé sur toute l'app Next.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  log("ERROR", "Erreur inattendue sur le pool PostgreSQL", { error: err.message });
});

export type Todo = {
  id: number;
  text: string;
  completed: boolean;
  created_at: string;
};

export async function getTodos(): Promise<Todo[]> {
  const result = await pool.query<Todo>(
    "SELECT * FROM todos ORDER BY created_at DESC"
  );
  return result.rows;
}

export async function createTodo(text: string): Promise<Todo> {
  const result = await pool.query<Todo>(
    "INSERT INTO todos (text) VALUES ($1) RETURNING *",
    [text]
  );
  return result.rows[0];
}

export async function toggleTodo(id: number): Promise<Todo> {
  const result = await pool.query<Todo>(
    "UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0];
}

export async function deleteTodo(id: number): Promise<void> {
  await pool.query("DELETE FROM todos WHERE id = $1", [id]);
}
