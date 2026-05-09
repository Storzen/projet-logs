DOPPLER_PROJECT := logs
COMPOSE_FILE    := docker-compose.yml
ENV             ?= dev

ifeq ($(ENV),dev)
COMPOSE_ARGS := -f $(COMPOSE_FILE) -f docker-compose.override.yml
else
COMPOSE_ARGS := -f $(COMPOSE_FILE)
endif

DOPPLER := doppler run --project $(DOPPLER_PROJECT) --config $(ENV) --

.PHONY: up down restart build pull deploy logs ps health

up:
	$(DOPPLER) docker compose $(COMPOSE_ARGS) up -d

down:
	docker compose $(COMPOSE_ARGS) down

restart:
	$(DOPPLER) docker compose $(COMPOSE_ARGS) up -d --force-recreate

build:
	$(DOPPLER) docker compose $(COMPOSE_ARGS) build --no-cache

pull:
	$(DOPPLER) docker compose $(COMPOSE_ARGS) pull

deploy:
	$(DOPPLER) docker compose -f $(COMPOSE_FILE) pull todo-app
	$(DOPPLER) docker compose -f $(COMPOSE_FILE) up -d --no-deps todo-app

logs:
	docker compose $(COMPOSE_ARGS) logs -f

ps:
	docker compose $(COMPOSE_ARGS) ps

health:
	docker compose $(COMPOSE_ARGS) ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"
