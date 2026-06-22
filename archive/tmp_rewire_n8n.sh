#!/bin/bash
# Analisis mendalam: koneksi "response" dari Webhook ke node mana
# Dalam responseNode mode, n8n menunggu node yang dikoneksikan ke Webhook "response" output

echo "=== Baca connections dari DB ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -t -c \"SELECT connections FROM workflow_entity WHERE id = 'eKQiMYAoTxbNV1IU';\"
" | python3 -c "
import sys, json
data = sys.stdin.read().strip()
try:
    conn = json.loads(data)
    print(json.dumps(conn, indent=2))
except Exception as e:
    print('Error:', e)
    print('Data:', data[:200])
"

echo ""
echo "=== Strategi: Webhook response -> Respond to Webhook (langsung) ==="
echo "Bukan melalui Format Response"

python3 << 'PYEOF'
import json, subprocess

# Baca current nodes dari file
with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json') as f:
    wf = json.load(f)

# Rearrange koneksi:
# Webhook.main -> PostgreSQL (fetch data)
# PostgreSQL.main -> Format Response (format data)
# Format Response.main -> Respond to Webhook (send response to caller)
# Webhook.response -> Respond to Webhook (ini yang HARUS ada untuk responseNode mode)

new_connections = {
    "Webhook": {
        "main": [[{"node": "PostgreSQL", "type": "main", "index": 0}]],
        "response": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    },
    "PostgreSQL": {
        "main": [[{"node": "Format Response", "type": "main", "index": 0}]]
    },
    "Format Response": {
        "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
}

# Update Format Response code - perlu expose data ke Respond to Webhook
for n in wf['nodes']:
    if n['name'] == 'Format Response':
        # Set data agar bisa diambil oleh Respond to Webhook
        n['parameters']['jsCode'] = (
            "const items = $input.all().map(i => i.json);\n"
            "const grand_total = items.reduce((s, i) => s + parseFloat(i.total_nilai || 0), 0);\n"
            "return [{ json: { transfers: items, grand_total } }];"
        )
    if n.get('type') == 'n8n-nodes-base.respondToWebhook':
        n['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ JSON.stringify($json) }}"
        }

wf['connections'] = new_connections

print("New connections:")
print(json.dumps(new_connections, indent=2))

with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json', 'w') as f:
    json.dump(wf, f, indent=2)

print("Workflow saved!")

# Generate SQL
nodes_json = json.dumps(wf['nodes']).replace("'", "''")
conn_json = json.dumps(new_connections).replace("'", "''")
with open('/tmp/update_wf2.sql', 'w') as f:
    f.write(f"""
UPDATE workflow_entity
SET
  nodes = '{nodes_json}'::json,
  connections = '{conn_json}'::json,
  active = true,
  "updatedAt" = NOW()
WHERE id = 'eKQiMYAoTxbNV1IU'
RETURNING id, name, active;
""")
print("SQL written to /tmp/update_wf2.sql")
PYEOF

echo ""
echo "=== Apply SQL ==="
docker cp /tmp/update_wf2.sql n8n-stack-postgres-1:/tmp/update_wf2.sql
docker exec n8n-stack-postgres-1 sh -c "psql -U n8n -d n8n -f /tmp/update_wf2.sql"

echo ""
echo "=== Restart n8n ==="
docker restart n8n-stack-n8n-1
sleep 12

echo ""
echo "=== Test webhook ==="
RESP=$(curl -s --max-time 25 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response (first 800 chars):"
echo "$RESP" | head -c 800
