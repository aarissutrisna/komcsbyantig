#!/bin/bash
# Schema berbeda - cari tabel yang ada
echo "=== Lihat semua tabel di n8n DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c '\dt' | grep -v '^$'
"

echo ""
echo "=== Cari tabel user dan api key ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' ORDER BY table_name;'
"

echo ""
echo "=== Info user ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT id, email, \"globalRole\", \"createdAt\" FROM \"user\" LIMIT 5;' 2>/dev/null ||
  psql -U n8n -d n8n -c '\d user' 2>/dev/null | head -20
"

echo ""
echo "=== User API keys table ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT * FROM user_api_keys LIMIT 5;' 2>/dev/null
  psql -U n8n -d n8n -c '\d user_api_keys;' 2>/dev/null | head -20
"
