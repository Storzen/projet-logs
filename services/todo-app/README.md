# todo-app

Application Next.js de démonstration pour la stack de centralisation des logs. Elle sert une liste de tâches stockée dans PostgreSQL et écrit un log JSON sur la sortie standard à chaque lecture, création, mise à jour ou suppression, pour que Promtail le collecte et que Grafana l'affiche.

## API

| Méthode  | Route              | Rôle                                                   |
| -------- | ------------------ | ------------------------------------------------------ |
| `GET`    | `/api/health`      | Sonde de santé, renvoie le hostname du conteneur       |
| `GET`    | `/api/todos`       | Liste des tâches                                       |
| `POST`   | `/api/todos`       | Création d'une tâche                                   |
| `PATCH`  | `/api/todos/[id]`  | Bascule l'état terminé de la tâche                     |
| `DELETE` | `/api/todos/[id]`  | Suppression                                            |

Le hostname renvoyé par `/api/health` permet de vérifier que Traefik répartit bien les requêtes entre les deux répliques.

## Format des logs

`lib/logger.ts` écrit une ligne JSON par événement, sur `stdout` (ou `stderr` pour `ERROR`) :

```json
{"timestamp":"2026-05-04T22:06:16.860Z","level":"INFO","message":"...","service":"todo-app"}
```

Promtail extrait le champ `level` pour en faire un label Loki, ce qui permet des requêtes comme `{service="todo-app"} | json | level="ERROR"`.

## Configuration

La connexion PostgreSQL (`lib/db.ts`) lit les variables standard de `pg` : `PGHOST` (défaut `postgres`), `PGPORT` (défaut `5432`), `PGUSER`, `PGPASSWORD`, `PGDATABASE`. `docker-compose.yml` les renseigne à partir de `POSTGRES_*`.

## Développement

```bash
bun install
bun dev        # http://localhost:3000, nécessite un PostgreSQL joignable
bun run lint
```

L'image Docker est construite en multi-stage avec Bun et s'exécute avec un utilisateur non-root.
