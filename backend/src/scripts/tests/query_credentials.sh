#!/bin/bash
docker exec n8n-postgres psql -U n8n -d n8n -c "SELECT id, name, type, data FROM credentials_entity WHERE name = 'ipos5pjbm' OR type = 'postgres';"
