# Plan de déploiement — projet-logs sur AWS EC2

## Stack cible

`<DOMAIN>` désigne la valeur de la variable `DOMAIN` (Doppler ou `.env`).

| Service | URL de prod |
|---|---|
| Todo App | `todo.<DOMAIN>` |
| Grafana (logs) | `logs.<DOMAIN>` |
| Traefik dashboard | pas de route publique, port 8080 par tunnel SSH |

---

## Décision architecture

**Dokploy non utilisé** : il installe sa propre instance Traefik et rentrerait en conflit avec la configuration Traefik manuelle du projet, qui est précisément ce qui est évalué. Le CI/CD GitLab (build → ECR → deploy EC2) remplace ce que Dokploy apporterait.

---

## Phase 1 — AWS : créer l'infrastructure

### 1.1 Instance EC2

- Type : **t3.small** (2 vCPU, 2 Go RAM)
- AMI : **Ubuntu 24.04 LTS**
- Stockage : **20 Go minimum**
- Security Group — ports à ouvrir :
  - `22` SSH (restreindre à ton IP)
  - `80` HTTP (monde entier)
  - `443` HTTPS (monde entier)

### 1.2 Elastic IP

Allouer une Elastic IP et l'associer à l'instance EC2.
Cette IP fixe sera utilisée dans les enregistrements DNS.

### 1.3 Repository ECR

Créer un repository ECR nommé `todo-app` dans la région cible (ex: `eu-central-1`).
Noter l'`AWS_ACCOUNT_ID` pour les variables CI/CD.

---

## Phase 2 — DNS

Chez le registrar du domaine, créer **2 enregistrements A** pointant vers l'Elastic IP EC2 :

| Sous-domaine | Type | Valeur |
|---|---|---|
| `todo.<DOMAIN>` | A | `<Elastic IP>` |
| `logs.<DOMAIN>` | A | `<Elastic IP>` |

> La propagation DNS prend 5 à 30 minutes.

---

## Phase 3 — Préparer l'EC2

```bash
# Connexion SSH
ssh -i ta-cle.pem ubuntu@<Elastic IP>

# Installer Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Vérifier
docker --version && docker compose version

# Cloner le projet
git clone https://github.com/Storzen/projet-logs.git /opt/projet-logs
cd /opt/projet-logs

# Créer le fichier .env de production
cp .env.example .env
nano .env  # remplir toutes les variables
```

---

## Phase 4 — HTTPS

Rien à modifier dans le code, `docker-compose.yml` contient déjà la configuration :

- Traefik écoute sur le port **443** (websecure) avec Let's Encrypt ACME (TLS challenge)
- Redirection HTTP → HTTPS globale via `--entrypoints.web.http.redirections.entrypoint.to=websecure`
- Volume `letsencrypt` persistant pour stocker les certificats (`/letsencrypt/acme.json`)
- Tous les routers Traefik utilisent `entrypoints=websecure` + `tls.certresolver=letsencrypt`
- Domaines dérivés de `DOMAIN` :
  - `todo.<DOMAIN>` → todo-app
  - `logs.<DOMAIN>` → Grafana
- Le dashboard Traefik n'a pas de route publique. Pour y accéder : `ssh -L 8080:localhost:8080 ubuntu@<Elastic IP>`, puis `http://localhost:8080/dashboard/`

Il reste à renseigner `DOMAIN` et `ACME_EMAIL` dans Doppler (config `prd`) ou dans le `.env` : Let's Encrypt y envoie les alertes d'expiration.

---

## Phase 5 — Installer le GitLab Runner sur EC2

```bash
# Installer le Runner
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt install gitlab-runner

# Enregistrer le Runner
# Le token se trouve dans : GitLab → Settings → CI/CD → Runners → New project runner
sudo gitlab-runner register \
  --url https://gitlab.com \
  --token <TON_TOKEN> \
  --executor docker \
  --docker-image docker:24 \
  --description "ec2-runner"
```

> Avec le nouveau format de token (`glrt-`), `--tag-list` n'est plus accepté à la registration.
> Ajouter le tag `ec2` après coup dans GitLab : **Settings → CI/CD → Runners → ton runner → Edit → Tags**.

---

## Phase 6 — Variables GitLab CI/CD

Doppler centralise tous les secrets. Dans GitLab → Settings → CI/CD → Variables, **une seule variable** suffit :

| Variable | Description |
|---|---|
| `DOPPLER_TOKEN` | Service token Doppler (projet `logs`, config `prd`) |

Créer le service token dans Doppler : **logs → prd → Access → Generate Service Token**.

Tous les secrets AWS, Postgres, Grafana sont dans Doppler et injectés automatiquement par le pipeline.

### Variables stockées dans Doppler (config `prd`)

| Clé Doppler | Usage |
|---|---|
| `AWS_ACCESS_KEY_ID` | Auth ECR + backup S3 |
| `AWS_SECRET_ACCESS_KEY` | Auth ECR + backup S3 |
| `AWS_ACCOUNT_ID` | Construction de l'URL ECR |
| `AWS_DEFAULT_REGION` | Région AWS |
| `S3_BUCKET_NAME` | Bucket backup Loki |
| `POSTGRES_DB` | Base de données |
| `POSTGRES_USER` | Utilisateur Postgres |
| `POSTGRES_PASSWORD` | Mot de passe Postgres |
| `GRAFANA_USER` | Admin Grafana |
| `GRAFANA_PASSWORD` | Mot de passe Grafana |
| `ACME_EMAIL` | Email Let's Encrypt (HTTPS) |
| `DOMAIN` | Domaine racine des routes Traefik |

---

## Phase 7 — Premier déploiement manuel

```bash
# Sur l'EC2 — démarrage initial avant que le CI/CD ne prenne le relais
cd /opt/projet-logs
docker compose pull
docker compose up -d

# Vérifier l'état de tous les services
docker compose ps

# Vérifier les logs Traefik (certificats HTTPS)
docker compose logs traefik

# Vérifier les logs de l'app
docker compose logs todo-app
```

Une fois ce premier boot validé, chaque `git push` sur `main` déclenche automatiquement le pipeline GitLab (build → push ECR → redémarrage todo-app sur EC2).

---

## Récapitulatif dans l'ordre

```
1. Console AWS  → EC2 t3.small + Elastic IP + ECR repo
2. Registrar    → 2 enregistrements DNS A → Elastic IP
3. EC2 SSH      → Docker + clonage repo + .env de prod
4. EC2 SSH      → Installer + enregistrer le GitLab Runner (tag: ec2)
5. GitLab UI    → Ajouter la variable DOPPLER_TOKEN
6. EC2 SSH      → docker compose up -d (premier boot)
7. Git push     → Pipeline automatique pour tous les déploiements suivants
```

---

## Points bonus

| Point | État |
|---|---|
| HTTPS via Let's Encrypt (Traefik ACME) | Fait |
| 2 répliques de todo-app avec load balancing Traefik | Fait (`deploy.replicas: 2`) |
| WAF (ModSecurity) | Non implémenté, complexe à brancher sur Traefik v3 |
