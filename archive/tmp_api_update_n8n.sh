#!/bin/bash
# Gunakan n8n REST API untuk activate/deactivate/update workflow
# API key: opencode-key-001

API_KEY="opencode-key-001"
API_BASE="http://localhost:5678/api/v1"
WF_ID="eKQiMYAoTxbNV1IU"

echo "=== Get current workflow state via API ==="
WF_JSON=$(curl -s -H "X-N8N-API-KEY: $API_KEY" "${API_BASE}/workflows/${WF_ID}")
echo "$WF_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('Name:', d.get('name'))
    print('Active:', d.get('active'))
    for n in d.get('nodes', []):
        print(f'  Node: {n[\"name\"]} ({n[\"type\"]})')
        if n.get('type') == 'n8n-nodes-base.webhook':
            print(f'    responseMode:', n.get('parameters', {}).get('options', {}).get('responseMode'))
        if n.get('type') == 'n8n-nodes-base.code':
            print(f'    jsCode:', n.get('parameters', {}).get('jsCode', '')[:100])
except Exception as e:
    print('Error:', e)
    print('Raw:', sys.stdin.read()[:200])
"

echo ""
echo "=== Deactivate workflow ==="
curl -s -X PATCH -H "X-N8N-API-KEY: $API_KEY" -H "Content-Type: application/json" \
  -d '{"active": false}' \
  "${API_BASE}/workflows/${WF_ID}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('active:', d.get('active'))"

echo ""
echo "=== Update workflow nodes via REST API ==="
# Baca workflow JSON lengkap
FULL_WF=$(curl -s -H "X-N8N-API-KEY: $API_KEY" "${API_BASE}/workflows/${WF_ID}")

# Patch dan PUT kembali
echo "$FULL_WF" | python3 - << 'PYEOF'
import sys, json, subprocess

wf = json.load(sys.stdin)

# Patch Webhook node responseMode
for n in wf.get('nodes', []):
    if n.get('type') == 'n8n-nodes-base.webhook':
        n['parameters']['options']['responseMode'] = 'responseNode'
        print(f"Webhook responseMode: responseNode")
    if n.get('name') == 'Format Response':
        n['parameters']['jsCode'] = (
            "const items = $input.all().map(i => i.json);\n"
            "const grand_total = items.reduce((s, i) => s + parseFloat(i.total_nilai || 0), 0);\n"
            "return [{ json: { transfers: items, grand_total } }];"
        )
        print(f"Format Response code updated")
    if n.get('type') == 'n8n-nodes-base.respondToWebhook':
        n['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ $json }}"
        }
        print(f"Respond to Webhook updated")

# Cek jika Respond to Webhook belum ada
has_respond = any(n['type'] == 'n8n-nodes-base.respondToWebhook' for n in wf.get('nodes', []))
if not has_respond:
    respond_node = {
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={{ $json }}"
        },
        "id": "respond-node-001"
    }
    wf['nodes'].append(respond_node)
    print("Added Respond to Webhook node")

# Update koneksi
if 'Format Response' not in wf.get('connections', {}):
    wf['connections']['Format Response'] = {}
wf['connections']['Format Response']['main'] = [[{
    "node": "Respond to Webhook",
    "type": "main",
    "index": 0
}]]

# Simpan ke file untuk dikirim via curl
with open('/tmp/wf_patched.json', 'w') as f:
    json.dump(wf, f)
print("Saved to /tmp/wf_patched.json")
PYEOF

echo ""
echo "=== PUT updated workflow via API ==="
PUT_RESP=$(curl -s -X PUT -H "X-N8N-API-KEY: $API_KEY" -H "Content-Type: application/json" \
  -d @/tmp/wf_patched.json \
  "${API_BASE}/workflows/${WF_ID}")
echo "$PUT_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('Updated name:', d.get('name'))
    print('Active:', d.get('active'))
    for n in d.get('nodes', []):
        if n.get('type') in ['n8n-nodes-base.webhook', 'n8n-nodes-base.respondToWebhook']:
            print(f'  {n[\"name\"]}:', n.get('parameters', {}).get('options', {}).get('responseMode', n.get('parameters', {})))
except:
    print('Raw (first 300):', sys.stdin.read()[:300])
"

echo ""
echo "=== Activate workflow via API ==="
ACT_RESP=$(curl -s -X PATCH -H "X-N8N-API-KEY: $API_KEY" -H "Content-Type: application/json" \
  -d '{"active": true}' \
  "${API_BASE}/workflows/${WF_ID}")
echo "$ACT_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('Active:', d.get('active'), '| Name:', d.get('name'))
except:
    print('Raw:', sys.stdin.read()[:200])
"

echo ""
echo "=== Cek webhook registry ==="
docker exec n8n-stack-postgres-1 sh -c "
  psql -U n8n -d n8n -c 'SELECT \"webhookPath\", method, \"workflowId\" FROM webhook_entity;'
"

echo ""
sleep 2
echo "=== Test webhook FINAL ==="
RESP=$(curl -s --max-time 20 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response (first 600 chars):"
echo "$RESP" | head -c 600
