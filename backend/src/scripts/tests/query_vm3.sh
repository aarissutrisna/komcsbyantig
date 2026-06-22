#!/bin/bash
echo "=== PostgreSQL Databases ==="
docker exec n8n-postgres psql -U n8n -d n8n -c "\l"

echo "=== PostgreSQL Tables in n8n database ==="
docker exec n8n-postgres psql -U n8n -d n8n -c "\dt"
