#!/bin/bash
# Cek mount path di dalam container n8n
echo "=== Mount paths inside n8n container ==="
docker exec n8n-stack-n8n-1 sh -c "ls /home/node/.n8n/ 2>/dev/null || ls /data/ 2>/dev/null || echo 'no data dir'"

echo ""
echo "=== n8n environment ==="
docker exec n8n-stack-n8n-1 sh -c "env | grep -E 'N8N|DB_|WEBHOOK|EXECUTIONS' | sort"

echo ""
echo "=== n8n data folder ==="
docker exec n8n-stack-n8n-1 sh -c "ls /home/node/.n8n/ 2>/dev/null"

echo ""
echo "=== Copy workflow file into container and import ==="
WORKFLOW_ID="eKQiMYAoTxbNV1IU"

# Copy patched workflow into container
docker cp /home/n8n/workflows/ipos-transfer-bonus-v2.json n8n-stack-n8n-1:/tmp/wf.json
echo "File copied to container"

# Use n8n CLI to import
docker exec n8n-stack-n8n-1 sh -c "n8n import:workflow --input=/tmp/wf.json 2>&1"

echo ""
echo "=== Test webhook after import ==="
sleep 2
RESP=$(curl -s "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response: $RESP"
