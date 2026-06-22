#!/bin/bash
# Update workflow langsung di PostgreSQL database n8n
# Ini adalah cara paling reliable tanpa bergantung pada CLI atau REST API

WF_ID="eKQiMYAoTxbNV1IU"

echo "=== Cek struktur workflow_entity ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c '\d workflow_entity' | head -30
"

echo ""
echo "=== Ambil current nodes dari DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -t -c \"SELECT nodes FROM workflow_entity WHERE id = '$WF_ID';\"
" | head -5

echo ""
echo "=== Update nodes dan connections di DB ==="
docker exec n8n-stack-postgres-1 sh -c "
psql -U n8n -d n8n << 'SQL'
-- Tampilkan current state
SELECT 
  id, name, active,
  jsonb_array_length(nodes::jsonb) as node_count
FROM workflow_entity 
WHERE id = 'eKQiMYAoTxbNV1IU';
SQL
"

echo ""
echo "=== Buat JSON patches ==="
# Buat nodes JSON baru dengan python
python3 << 'PYEOF'
import json, subprocess

# Baca workflow dari file yang sudah kita patch
with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json') as f:
    wf = json.load(f)

nodes = wf.get('nodes', [])
connections = wf.get('connections', {})

# Verify Respond to Webhook ada
has_respond = any(n['type'] == 'n8n-nodes-base.respondToWebhook' for n in nodes)
print(f"Has Respond to Webhook: {has_respond}")
for n in nodes:
    t = n.get('type', '')
    print(f"  {n['name']}: {t}")
    if t == 'n8n-nodes-base.webhook':
        print(f"    responseMode: {n.get('parameters', {}).get('options', {}).get('responseMode')}")
    if t == 'n8n-nodes-base.respondToWebhook':
        print(f"    params: {n.get('parameters', {})}")

# Simpan nodes dan connections sebagai JSON untuk query
nodes_json = json.dumps(nodes).replace("'", "''")
conn_json = json.dumps(connections).replace("'", "''")

with open('/tmp/update_wf.sql', 'w') as f:
    f.write(f"""
UPDATE workflow_entity
SET
  nodes = '{nodes_json}'::json,
  connections = '{conn_json}'::json,
  active = true
WHERE id = 'eKQiMYAoTxbNV1IU'
RETURNING id, name, active, jsonb_array_length(nodes::jsonb) as node_count;
""")

print("SQL file written to /tmp/update_wf.sql")
PYEOF

echo ""
echo "=== Execute SQL update ==="
docker cp /tmp/update_wf.sql n8n-stack-postgres-1:/tmp/update_wf.sql
docker exec n8n-stack-postgres-1 sh -c "psql -U n8n -d n8n -f /tmp/update_wf.sql"

echo ""
echo "=== Update workflow_published_version juga ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c \"
  SELECT id, \\\"workflowId\\\", \\\"versionId\\\" 
  FROM workflow_published_version 
  WHERE \\\"workflowId\\\" = 'eKQiMYAoTxbNV1IU'
  LIMIT 3;
  \"
"

echo ""
echo "=== Restart n8n untuk reload semua workflows dari DB ==="
docker restart n8n-stack-n8n-1
sleep 12

echo ""
echo "=== Cek webhook registry post-restart ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT \"webhookPath\", method, \"workflowId\" FROM webhook_entity;'
"

echo ""
echo "=== Test webhook FINAL ==="
RESP=$(curl -s --max-time 25 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response:"
echo "$RESP" | head -c 800
