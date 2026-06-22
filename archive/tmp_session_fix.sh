#!/bin/bash
# Login ke n8n via REST API dan fix workflow menggunakan session token

N8N_URL="http://localhost:5678"
EMAIL="arissutrisna"
PASSWORD="K@dal4o00"
WF_ID="eKQiMYAoTxbNV1IU"

echo "=== Login ke n8n ==="
LOGIN_RESP=$(curl -s -c /tmp/n8n_cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "${N8N_URL}/rest/login")
echo "Login response: $LOGIN_RESP" | head -c 300

echo ""
echo "=== Cek cookies ==="
cat /tmp/n8n_cookies.txt

echo ""
echo "=== Get workflow via session ==="
WF_DATA=$(curl -s -b /tmp/n8n_cookies.txt \
  "${N8N_URL}/rest/workflows/${WF_ID}")
echo "$WF_DATA" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('Name:', d.get('name'))
    print('Active:', d.get('active'))
    for n in d.get('nodes', []):
        t = n.get('type','')
        print(f'  Node: {n[\"name\"]} ({t})')
        if t == 'n8n-nodes-base.webhook':
            opts = n.get('parameters',{}).get('options',{})
            print(f'    responseMode: {opts.get(\"responseMode\")}')
except Exception as e:
    print('Error:', e)
    print(sys.stdin.read()[:300])
" 2>/dev/null || echo "Check raw response..."
echo "$WF_DATA" | head -c 500

echo ""
echo "=== Deactivate workflow ==="
curl -s -b /tmp/n8n_cookies.txt -X POST \
  "${N8N_URL}/rest/workflows/${WF_ID}/deactivate" | head -c 100

echo ""
echo "=== Patch workflow: fix Webhook responseMode dan tambah Respond to Webhook ==="
echo "$WF_DATA" | python3 - << 'PYEOF'
import sys, json

try:
    wf = json.load(sys.stdin)
except:
    print("Failed to parse workflow JSON")
    sys.exit(1)

# Patch nodes
for n in wf.get('nodes', []):
    if n.get('type') == 'n8n-nodes-base.webhook':
        if 'options' not in n['parameters']:
            n['parameters']['options'] = {}
        n['parameters']['options']['responseMode'] = 'responseNode'
        print(f"Webhook responseMode -> responseNode")
    if n.get('name') == 'Format Response':
        n['parameters']['jsCode'] = (
            "const items = $input.all().map(i => i.json);\n"
            "const grand_total = items.reduce((s, i) => s + parseFloat(i.total_nilai || 0), 0);\n"
            "return [{ json: { transfers: items, grand_total } }];"
        )
        print("Format Response code updated")
    if n.get('type') == 'n8n-nodes-base.respondToWebhook':
        n['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ $json }}"
        }
        print("Respond to Webhook params updated")

# Add Respond to Webhook if missing
has_respond = any(n['type'] == 'n8n-nodes-base.respondToWebhook' for n in wf.get('nodes', []))
if not has_respond:
    wf['nodes'].append({
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={{ $json }}"
        },
        "id": "respond-node-001"
    })
    print("Added Respond to Webhook node")

# Fix connections
wf['connections']['Format Response'] = {
    "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
}
print("Format Response -> Respond to Webhook connected")

# Save to file
with open('/tmp/wf_session_patch.json', 'w') as f:
    json.dump(wf, f)
print("Saved to /tmp/wf_session_patch.json")
PYEOF

echo ""
echo "=== PUT workflow via session ==="
PUT_RESP=$(curl -s -b /tmp/n8n_cookies.txt -X PUT \
  -H "Content-Type: application/json" \
  -d @/tmp/wf_session_patch.json \
  "${N8N_URL}/rest/workflows/${WF_ID}")
echo "$PUT_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('PUT result - Name:', d.get('name'), '| Active:', d.get('active'))
    for n in d.get('nodes', []):
        t = n.get('type','')
        print(f'  {n[\"name\"]}: {t}')
except:
    raw = sys.stdin.read()
    print('Raw (300):', raw[:300])
" 2>/dev/null

echo ""
echo "=== Activate via session ==="
curl -s -b /tmp/n8n_cookies.txt -X POST \
  "${N8N_URL}/rest/workflows/${WF_ID}/activate" | head -c 200

echo ""
sleep 2
echo "=== Test webhook ==="
RESP=$(curl -s --max-time 20 "${N8N_URL}/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response (600 chars):"
echo "$RESP" | head -c 600
