#!/bin/bash
# Coba aktivasi ulang workflow via n8n REST API internal
# n8n CLI sudah import, tapi workflow dinonaktifkan - perlu diaktifkan lagi

echo "=== Activate workflow via CLI ==="
docker exec n8n-stack-n8n-1 sh -c "n8n import:workflow --input=/tmp/wf.json --activate 2>&1"

echo ""
echo "=== Check workflow active status in DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"SELECT id, name, active FROM workflow_entity WHERE id = 'eKQiMYAoTxbNV1IU';\"
"

echo ""
echo "=== Activate via DB directly ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"UPDATE workflow_entity SET active = true WHERE id = 'eKQiMYAoTxbNV1IU' RETURNING id, name, active;\"
"

echo ""
echo "=== Check webhook registry ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"SELECT * FROM webhook_entity WHERE \\\"workflowId\\\" = 'eKQiMYAoTxbNV1IU';\"
"

echo ""
echo "=== Restart n8n container to reload webhooks ==="
docker restart n8n-stack-n8n-1

echo "Waiting 8 seconds for n8n to start..."
sleep 8

echo ""
echo "=== Test webhook AFTER restart ==="
RESP=$(curl -s --max-time 15 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response: $RESP" | head -c 500
