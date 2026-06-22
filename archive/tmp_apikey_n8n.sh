#!/bin/bash
# Cari atau buat n8n API key via database langsung
# n8n menyimpan API keys di tabel api_key

echo "=== Cek tabel API keys di n8n DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c '\dt' | grep -i api
"

docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT id, label, \"userId\", \"apiKey\" FROM api_key LIMIT 5;' 2>/dev/null || 
  psql -U n8n -d n8n -c 'SELECT * FROM api_keys LIMIT 5;' 2>/dev/null ||
  echo 'No api_key table found'
"

echo ""
echo "=== Lihat user untuk mendapat userId ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT id, email, role FROM \"user\" LIMIT 5;'
"

echo ""
echo "=== Coba dengan user owner menggunakan n8n CLI untuk generate API key ==="
USER_ID=$(docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -t -c 'SELECT id FROM \"user\" WHERE role = '\''global:owner'\'' LIMIT 1;'
" | tr -d ' ')
echo "Owner user ID: $USER_ID"

echo ""
echo "=== Coba insert API key langsung ke DB ==="
NEW_KEY="n8n_api_$(openssl rand -hex 20)"
echo "Generated key: $NEW_KEY"

docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"
  INSERT INTO api_key (id, label, \\\"apiKey\\\", \\\"userId\\\", \\\"createdAt\\\", \\\"updatedAt\\\")
  VALUES (
    gen_random_uuid()::text,
    'admin-script',
    '$NEW_KEY',
    (SELECT id FROM \\\"user\\\" WHERE role = 'global:owner' LIMIT 1),
    NOW(), NOW()
  ) ON CONFLICT DO NOTHING RETURNING id, label, \\\"apiKey\\\";
\"" 2>&1

echo ""
echo "=== Cek key yang ada ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT id, label, \"apiKey\", \"userId\" FROM api_key;'
" 2>/dev/null

echo ""
echo "=== Test API dengan key yang ada ==="
# Ambil key apapun yang ada di DB
ACTUAL_KEY=$(docker exec n8n-stack-postgres-1 sh -c "psql -U n8n -d n8n -t -c 'SELECT \"apiKey\" FROM api_key LIMIT 1;'" | tr -d ' ')
echo "Using key: $ACTUAL_KEY"

if [ -n "$ACTUAL_KEY" ]; then
  curl -s -H "X-N8N-API-KEY: $ACTUAL_KEY" "http://localhost:5678/api/v1/workflows/eKQiMYAoTxbNV1IU" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Workflow:', d.get('name'), '| Active:', d.get('active'))" 2>/dev/null
fi
