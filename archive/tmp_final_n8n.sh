#!/bin/bash
# Import workflow yang sudah di-patch, aktifkan, dan test

echo "=== Copy workflow ke container ==="
docker cp /home/n8n/workflows/ipos-transfer-bonus-v2.json n8n-stack-n8n-1:/tmp/wf_final.json

echo ""
echo "=== Import via CLI ==="
docker exec n8n-stack-n8n-1 sh -c "n8n import:workflow --input=/tmp/wf_final.json 2>&1"

echo ""
echo "=== Aktifkan workflow di DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"UPDATE workflow_entity SET active = true WHERE id = 'eKQiMYAoTxbNV1IU' RETURNING id, name, active;\"
"

echo ""
echo "=== Restart n8n untuk reload webhooks ==="
docker restart n8n-stack-n8n-1
sleep 10
echo "n8n restarted"

echo ""
echo "=== Cek webhook registry setelah restart ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT \"webhookPath\", method, \"workflowId\" FROM webhook_entity;'
"

echo ""
echo "=== Test webhook ==="
RESP=$(curl -s --max-time 20 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response (first 500 chars):"
echo "$RESP" | head -c 500
