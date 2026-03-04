# 📋 Centralisation des Logs Applicatifs

Projet réalisé dans le cadre du cours **Cloud, Virtualisation & Datacenter** — Institut Saint Jean.

Mise en place d'une stack complète de centralisation et visualisation des logs pour plusieurs services conteneurisés, avec pipeline CI/CD automatisé et déploiement sur AWS.

---

## Table des matières

- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Pipeline CI/CD](#pipeline-cicd)
- [Structure du projet](#structure-du-projet)

---

## Architecture

```
Navigateur
    │
    ▼
[Traefik :80]          ← découverte automatique des services via Docker socket
    │
    ├──► todo.localhost     ──► [Next.js :3000]
    │                                │
    │                          [PostgreSQL :5432]   (réseau interne uniquement)
    │
    └──► grafana.localhost  ──► [Grafana :3000]
                                     │
                                [Loki :3100]         ← stockage des logs
                                     ▲
                                [Promtail]           ← collecte via Docker socket
```

**Flux des logs :**

```
Conteneurs Docker → Promtail → Loki → Grafana
```

Promtail collecte les logs de tous les conteneurs taggés `logging=promtail`, les enrichit avec des labels (nom du service, niveau de log), et les envoie à Loki. Grafana interroge Loki via LogQL pour les afficher.

---

## Stack technique

| Rôle                         | Outil                                                                    |
| ---------------------------- | ------------------------------------------------------------------------ |
| Reverse proxy                | [Traefik v3](https://traefik.io/)                                        |
| Application de démonstration | [Next.js 14](https://nextjs.org/)                                        |
| Base de données              | [PostgreSQL 16](https://www.postgresql.org/)                             |
| Collecte des logs            | [Promtail 2.9](https://grafana.com/docs/loki/latest/send-data/promtail/) |
| Stockage des logs            | [Loki 2.9](https://grafana.com/oss/loki/)                                |
| Visualisation                | [Grafana 10](https://grafana.com/)                                       |
| CI/CD                        | GitLab CI                                                                |
| Container registry           | Amazon ECR                                                               |
| Déploiement                  | EC2 + GitLab Runner                                                      |

---

## Prérequis

- Docker >= 24 et Docker Compose >= 2.20
- Un compte AWS (pour ECR et le backup S3)
- Une instance EC2 avec le GitLab Runner installé (pour le CI/CD)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://gitlab.com/<votre-groupe>/projet-logs.git
cd projet-logs
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` et renseigner les valeurs :

```env
# PostgreSQL
POSTGRES_DB=todos
POSTGRES_USER=todouser
POSTGRES_PASSWORD=<mot_de_passe_fort>

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=<mot_de_passe_fort>

# AWS (backup S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3
S3_BUCKET_NAME=<votre-bucket>
```

> ⚠️ Ne jamais committer le fichier `.env` — il est dans le `.gitignore`.

### 3. Lancer la stack

```bash
docker compose up -d
```

### 4. Vérifier que tout est up

```bash
docker compose ps
```

Tous les services doivent être en état `healthy`.

---

## Utilisation

### Accès aux interfaces

| Service           | URL                      |
| ----------------- | ------------------------ |
| Todo App          | http://todo.localhost    |
| Grafana           | http://grafana.localhost |
| Dashboard Traefik | http://traefik.localhost |

> Sur Linux, si `.localhost` ne résout pas, ajouter ces lignes dans `/etc/hosts` :
>
> ```
> 127.0.0.1 todo.localhost
> 127.0.0.1 grafana.localhost
> 127.0.0.1 traefik.localhost
> ```

### Connecter Loki à Grafana (première fois)

1. Se connecter à Grafana avec les credentials du `.env`
2. Aller dans **Connections → Data sources → Add data source**
3. Choisir **Loki**
4. Renseigner l'URL : `http://loki:3100`
5. Cliquer **Save & test**

### Explorer les logs

Dans Grafana → **Explore**, quelques requêtes LogQL utiles :

```logql
# Tous les logs de la todo app
{service="todo-app"}

# Uniquement les erreurs
{service="todo-app"} | json | level="ERROR"

# Tous les services, filtrés par niveau
{level="WARN"}

# Logs PostgreSQL
{service="postgres"}
```

### Générer des logs de test

La todo app génère des logs structurés JSON à chaque action. Pour générer des erreurs visibles dans Grafana, on peut couper temporairement PostgreSQL :

```bash
docker compose stop postgres
# Effectuer des actions dans la todo app → des ERROR apparaissent dans Grafana
docker compose start postgres
```

---

## Pipeline CI/CD

Le pipeline GitLab CI se déclenche automatiquement à chaque push sur `main`. Il comporte 3 stages :

```
build  →  push (ECR)  →  deploy (EC2)
```

### Variables à configurer dans GitLab

**Settings → CI/CD → Variables** (cocher "Masked") :

| Variable                | Description                    |
| ----------------------- | ------------------------------ |
| `AWS_ACCESS_KEY_ID`     | Clé d'accès AWS                |
| `AWS_SECRET_ACCESS_KEY` | Secret AWS                     |
| `AWS_ACCOUNT_ID`        | ID du compte AWS (12 chiffres) |

### Installation du GitLab Runner sur l'EC2

```bash
# Installation
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt install gitlab-runner

# Enregistrement (token disponible dans GitLab → Settings → CI/CD → Runners)
sudo gitlab-runner register \
  --url https://gitlab.com \
  --executor docker \
  --docker-image docker:24

# Autoriser le Runner à utiliser Docker
sudo usermod -aG docker gitlab-runner
```

---

## Structure du projet

```
projet-logs/
│
├── .gitlab-ci.yml              ← pipeline CI/CD
├── docker-compose.yml          ← orchestration de tous les services
├── .env.example                ← template des variables d'environnement
├── .gitignore
│
├── config/
│   ├── loki/
│   │   └── loki-config.yml     ← configuration du stockage Loki
│   └── promtail/
│       └── promtail-config.yml ← règles de collecte et parsing des logs
│
└── services/
    ├── postgres/
    │   └── init.sql            ← schéma initial de la base de données
    │
    └── todo-app/               ← application Next.js de démonstration
        ├── Dockerfile          ← build multi-stage (non-root)
        ├── package.json
        ├── next.config.mjs
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   └── api/
        │       ├── health/route.ts
        │       └── todos/
        │           ├── route.ts        ← GET, POST
        │           └── [id]/route.ts   ← PATCH, DELETE
        ├── components/
        │   └── todo-list.tsx   ← UI avec optimistic updates
        └── lib/
            ├── db.ts           ← pool de connexions PostgreSQL
            ├── logger.ts       ← logs JSON structurés
            └── utils.ts        ← utilitaire Tailwind
```
