# Centralisation des logs applicatifs

Projet réalisé dans le cadre du cours **Cloud, Virtualisation & Datacenter** — Institut Saint Jean.

Mise en place d'une stack complète de centralisation et de visualisation des logs pour plusieurs services conteneurisés, avec pipeline CI/CD automatisé et déploiement sur AWS EC2.

---

## Table des matières

- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Gestion des secrets — Doppler](#gestion-des-secrets--doppler)
- [Commandes Makefile](#commandes-makefile)
- [Interfaces et accès](#interfaces-et-accès)
- [Explorer les logs](#explorer-les-logs)
- [Pipeline CI/CD](#pipeline-cicd)
- [Structure du projet](#structure-du-projet)

---

## Architecture

![Architecture — Centralisation des logs](./architecture_centralisation_logs.svg)

**Flux des logs :**

```
Conteneurs Docker → Promtail → Loki → Grafana
```

Promtail collecte les logs de tous les conteneurs labellisés `logging=promtail`, les enrichit avec des labels (nom du service, niveau de log), puis les envoie à Loki. Grafana interroge Loki via LogQL pour les visualiser en temps réel.

L'accès au socket Docker est délégué au **socket-proxy** (tecnativa), qui expose uniquement les endpoints nécessaires à Traefik et Promtail, sans jamais monter le socket directement dans ces conteneurs.

---

## Stack technique

| Rôle                         | Outil                                                                    | Version  |
| ---------------------------- | ------------------------------------------------------------------------ | -------- |
| Reverse proxy + TLS          | [Traefik](https://traefik.io/)                                           | v3       |
| Application de démonstration | [Next.js](https://nextjs.org/)                                           | 14       |
| Base de données              | [PostgreSQL](https://www.postgresql.org/)                                | 16       |
| Collecte des logs            | [Promtail](https://grafana.com/docs/loki/latest/send-data/promtail/)    | 2.9      |
| Stockage des logs            | [Loki](https://grafana.com/oss/loki/)                                    | 2.9      |
| Visualisation                | [Grafana](https://grafana.com/)                                          | 10.2     |
| Mises à jour automatiques    | [Watchtower](https://containrrr.dev/watchtower/)                         | latest   |
| Backup des données           | Script custom AWS CLI                                                    | —        |
| Proxy Docker socket          | [tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) | latest |
| Gestion des secrets          | [Doppler](https://doppler.com/)                                          | CLI      |
| CI/CD                        | GitLab CI                                                                | —        |
| Container registry           | Amazon ECR                                                               | —        |
| Déploiement                  | EC2 (Ubuntu 24.04) + GitLab Runner                                       | —        |

---

## Prérequis

- Docker >= 24 et Docker Compose >= 2.20
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) installé et authentifié (`doppler login`)
- Un compte AWS (pour ECR et le backup S3)
- Une instance EC2 avec Docker et le GitLab Runner installés (pour le CI/CD)

---

## Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone https://gitlab.com/<votre-groupe>/projet-logs.git
cd projet-logs
```

### 2. Configurer les secrets

Les secrets sont gérés via **Doppler** (voir la section dédiée). Pour un démarrage en développement sans Doppler, copier l'exemple et renseigner les valeurs :

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

> Ne jamais committer le fichier `.env` — il est dans le `.gitignore`.

### 3. Lancer la stack

```bash
# Avec Doppler (recommandé)
make up

# Sans Doppler (variables dans .env)
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 4. Vérifier l'état des services

```bash
make health
```

Tous les services doivent afficher un statut `healthy`.

---

## Gestion des secrets — Doppler

Ce projet utilise [Doppler](https://doppler.com/) pour centraliser et injecter les secrets, aussi bien en développement qu'en production. Il n'y a **aucun secret stocké en clair** dans le dépôt.

### Projet Doppler

- **Projet** : `logs`
- **Config dev** : `dev`
- **Config prod** : `prd`

### Variables gérées par Doppler

| Clé                     | Usage                                 |
| ----------------------- | ------------------------------------- |
| `POSTGRES_DB`           | Nom de la base de données             |
| `POSTGRES_USER`         | Utilisateur PostgreSQL                |
| `POSTGRES_PASSWORD`     | Mot de passe PostgreSQL               |
| `GRAFANA_USER`          | Identifiant admin Grafana             |
| `GRAFANA_PASSWORD`      | Mot de passe admin Grafana            |
| `AWS_ACCESS_KEY_ID`     | Auth ECR + backup S3                  |
| `AWS_SECRET_ACCESS_KEY` | Auth ECR + backup S3                  |
| `AWS_ACCOUNT_ID`        | Construction de l'URL ECR             |
| `AWS_DEFAULT_REGION`    | Région AWS cible                      |
| `S3_BUCKET_NAME`        | Bucket S3 pour les backups Loki       |
| `ACME_EMAIL`            | Email Let's Encrypt (certificats TLS) |

### Se connecter à Doppler

```bash
doppler login
doppler setup --project logs --config dev
```

---

## Commandes Makefile

Le `Makefile` encapsule les commandes Docker Compose avec injection automatique des secrets Doppler.

| Commande        | Description                                              |
| --------------- | -------------------------------------------------------- |
| `make up`       | Démarrer tous les services (mode dev avec override)      |
| `make down`     | Arrêter tous les services                                |
| `make restart`  | Redémarrer tous les services (`--force-recreate`)        |
| `make build`    | Rebuilder les images localement (`--no-cache`)           |
| `make pull`     | Télécharger les dernières images depuis les registries   |
| `make deploy`   | Mettre à jour uniquement `todo-app` depuis ECR           |
| `make logs`     | Suivre les logs de tous les services en temps réel       |
| `make ps`       | Lister l'état des conteneurs                             |
| `make health`   | Afficher le statut de santé formaté de chaque service    |

Pour forcer l'environnement de production :

```bash
make up ENV=prd
```

---

## Interfaces et accès

### En développement (local)

| Service           | URL                        |
| ----------------- | -------------------------- |
| Todo App          | http://todo.localhost      |
| Grafana           | http://grafana.localhost   |
| Dashboard Traefik | http://traefik.localhost   |

Sur Linux, si `.localhost` ne résout pas automatiquement, ajouter dans `/etc/hosts` :

```
127.0.0.1 todo.localhost
127.0.0.1 grafana.localhost
127.0.0.1 traefik.localhost
```

### En production (AWS EC2)

| Service           | URL                             |
| ----------------- | ------------------------------- |
| Todo App          | https://todo.yondrfit.com       |
| Grafana           | https://logs.yondrfit.com       |
| Dashboard Traefik | https://traefik.yondrfit.com    |

Les certificats TLS sont gérés automatiquement par Traefik via **Let's Encrypt** (ACME TLS Challenge).

### Connecter Loki à Grafana (première connexion)

1. Se connecter à Grafana avec les credentials du `.env` ou Doppler
2. Aller dans **Connections → Data sources → Add data source**
3. Choisir **Loki**
4. Renseigner l'URL : `http://loki:3100`
5. Cliquer **Save & test**

---

## Explorer les logs

Dans Grafana → **Explore**, quelques requêtes LogQL utiles :

```logql
# Tous les logs de la todo app
{service="todo-app"}

# Uniquement les erreurs
{service="todo-app"} | json | level="ERROR"

# Tous les services filtrés par niveau
{level="WARN"}

# Logs PostgreSQL
{service="postgres"}

# Logs Traefik
{service="traefik"}
```

### Générer des logs de test

La todo app émet des logs JSON structurés à chaque action. Pour provoquer des erreurs visibles dans Grafana :

```bash
docker compose stop postgres
# Effectuer des actions dans la todo app — des ERROR apparaissent dans Grafana
docker compose start postgres
```

---

## Pipeline CI/CD

Le pipeline GitLab CI se déclenche automatiquement à chaque push sur `main` et comporte 3 stages :

```
build → push (ECR) → deploy (EC2)
```

- **build** : construit l'image Docker de `todo-app` sur le runner EC2, la sauvegarde en artifact
- **push** : pousse l'image vers Amazon ECR (création automatique du repository si absent)
- **deploy** : se connecte à l'EC2, pull le dépôt, et redémarre `todo-app` via `make deploy ENV=prd`

### Variable GitLab requise

Une seule variable suffit dans **GitLab → Settings → CI/CD → Variables** :

| Variable        | Description                                          |
| --------------- | ---------------------------------------------------- |
| `DOPPLER_TOKEN` | Service token Doppler (projet `logs`, config `prd`)  |

Tous les autres secrets (AWS, PostgreSQL, Grafana) sont injectés automatiquement par Doppler lors de l'exécution du pipeline.

Générer le service token dans Doppler : **logs → prd → Access → Generate Service Token**.

### Installer le GitLab Runner sur EC2

```bash
# Installation
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt install gitlab-runner

# Enregistrement (token disponible dans GitLab → Settings → CI/CD → Runners)
sudo gitlab-runner register \
  --url https://gitlab.com \
  --token <TOKEN> \
  --executor docker \
  --docker-image docker:24 \
  --description "ec2-runner"

# Ajouter le tag "ec2" dans GitLab après enregistrement
# Settings → CI/CD → Runners → ton runner → Edit → Tags

# Autoriser le runner à utiliser Docker
sudo usermod -aG docker gitlab-runner
```

---

## Structure du projet

```
projet-logs/
│
├── .gitlab-ci.yml              ← pipeline CI/CD (build → ECR → deploy)
├── docker-compose.yml          ← stack de production
├── docker-compose.override.yml ← surcharges pour le développement local
├── Makefile                    ← commandes avec injection Doppler
├── .env.example                ← template des variables d'environnement
│
├── config/
│   ├── grafana/
│   │   ├── dashboards/         ← dashboards pré-provisionnés
│   │   └── provisioning/       ← datasources et dashboards auto-chargés
│   ├── loki/
│   │   └── loki-config.yml     ← configuration du stockage Loki
│   └── promtail/
│       └── promtail-config.yml ← règles de collecte et parsing des logs
│
├── docs/
│   ├── DEPLOIEMENT.md          ← guide de déploiement AWS complet
│   └── PLAN_RAPPORT.md         ← plan du rapport de projet
│
├── screenshots/                ← captures d'écran de l'interface
│
└── services/
    ├── backup/
    │   ├── Dockerfile          ← image Alpine avec AWS CLI + cron
    │   ├── backup.sh           ← script de backup Loki → S3
    │   └── crontab             ← planification des backups
    │
    ├── postgres/
    │   └── init.sql            ← schéma initial de la base de données
    │
    └── todo-app/               ← application Next.js de démonstration
        ├── Dockerfile          ← build multi-stage (non-root, Bun)
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
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
