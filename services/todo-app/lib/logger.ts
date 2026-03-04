type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";

export function log(level: Level, message: string, meta?: Record<string, unknown>) {
  // Format JSON structuré — Promtail peut extraire le champ "level"
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "todo-app",
    ...meta,
  };
  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
