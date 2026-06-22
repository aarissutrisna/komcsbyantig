#!/bin/bash
# Cek apakah ada cara expose tfitem.json via HTTP
# atau konfigurasi n8n untuk expose hasil via file serving

echo "=== Cek n8n execution API ==="
# Gunakan opencode-key-001 dengan format yang benar
curl -s -H "X-N8N-API-KEY: opencode-key-001" \
  "http://localhost:5678/api/v1/executions?limit=3" | head -c 300

echo ""
echo "=== Cek workflow execution via API ==="
curl -s -X POST \
  -H "X-N8N-API-KEY: opencode-key-001" \
  -H "Content-Type: application/json" \
  -d '{"startNodes": [], "data": {"startData": {}}}' \
  "http://localhost:5678/api/v1/workflows/eKQiMYAoTxbNV1IU/run" | head -c 300

echo ""
echo "=== Test dengan JWT token ==="
JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YTIwNWJlZi03NWUyLTRhYjYtOTkyYy0yZTI2ODcwMzgyYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImQ1ZjEwNDE3LWQ3ZjAtNDMxYy1hMjIwLWFhNmRmMTEyZWIyNyIsImlhdCI6MTc4MTUzMDI5MH0.EwBLyEtSsDvYPfR0vXBkLXdoZfIl5Hf7PGDbI3W-qAM"
curl -s -H "X-N8N-API-KEY: $JWT" "http://localhost:5678/api/v1/workflows/eKQiMYAoTxbNV1IU" | head -c 200

echo ""
echo "=== Cek apakah ada HTTP static file serving ==="
ls /home/n8n/data/

echo ""
echo "=== Setup nginx untuk serve tfitem.json sebagai HTTP endpoint ==="
# Cek apakah nginx atau caddy ada
which nginx 2>/dev/null || which caddy 2>/dev/null || which python3 2>/dev/null

echo ""
echo "=== Direct DB query dari host ke iPOS Postgres ==="
# Ambil kredensial postgres dari n8n container env
PGHOST=$(docker exec n8n-stack-n8n-1 sh -c 'echo $DB_POSTGRESDB_HOST')
echo "n8n DB host: $PGHOST"

# Coba query iPOS DB langsung
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT credentials FROM credentials_entity LIMIT 3;' 2>/dev/null | head -c 500
"
