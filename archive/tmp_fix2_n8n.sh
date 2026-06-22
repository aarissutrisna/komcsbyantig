#!/bin/bash
# Strategi: gunakan n8n API untuk update workflow via REST
# n8n API bisa diakses di port 5678

WORKFLOW_ID="eKQiMYAoTxbNV1IU"
API_BASE="http://localhost:5678"

echo "=== Cek apakah n8n API key tersedia ==="
API_KEY=$(docker exec n8n-stack-n8n-1 sh -c 'cat /home/node/.n8n/config 2>/dev/null' | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = d.get('userSettings', {}).get('apiKey', '') or d.get('apiKey', '')
    print(keys)
except:
    print('')
" 2>/dev/null)
echo "API key from config: '$API_KEY'"

echo ""
echo "=== Cek n8n public API ==="
curl -s "${API_BASE}/api/v1/workflows/${WORKFLOW_ID}" -H "Accept: application/json" | head -c 200

echo ""
echo "=== Alternatif: patch workflow JSON dengan Respond to Webhook node ==="
python3 << 'PYEOF'
import json

with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json') as f:
    wf = json.load(f)

# Tampilkan connections untuk analisa
print("CONNECTIONS:")
print(json.dumps(wf.get('connections', {}), indent=2))
print("")
print("NODES:")
for n in wf.get('nodes', []):
    print(f"  - {n['name']} ({n['type']})")
PYEOF

echo ""
echo "=== Buat workflow baru dengan Respond to Webhook node ==="
python3 << 'PYEOF'
import json

with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json') as f:
    wf = json.load(f)

# Cek apakah sudah ada "Respond to Webhook" node
has_respond = any(n['type'] == 'n8n-nodes-base.respondToWebhook' for n in wf.get('nodes', []))
print(f"Has Respond to Webhook node: {has_respond}")

if not has_respond:
    # Tambah "Respond to Webhook" node
    respond_node = {
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [850, 300],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={{ JSON.stringify($json) }}"
        },
        "id": "respond-node-001"
    }
    
    # Update webhook node: responseMode = responseNode (perlu ada respond node)
    for n in wf['nodes']:
        if n['type'] == 'n8n-nodes-base.webhook':
            n['parameters']['options']['responseMode'] = 'responseNode'
            print(f"Webhook responseMode set to: responseNode")
    
    # Tambah respond node
    wf['nodes'].append(respond_node)
    
    # Koneksikan Format Response -> Respond to Webhook
    if 'Format Response' not in wf['connections']:
        wf['connections']['Format Response'] = {}
    wf['connections']['Format Response']['main'] = [[{
        "node": "Respond to Webhook",
        "type": "main",
        "index": 0
    }]]
    
    print("Added Respond to Webhook node")
    print("Updated connections:")
    print(json.dumps(wf['connections'], indent=2))
    
    with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json', 'w') as f:
        json.dump(wf, f, indent=2)
    print("Workflow file updated!")
else:
    print("Respond to Webhook node already exists")
    for n in wf.get('nodes', []):
        if n['type'] == 'n8n-nodes-base.respondToWebhook':
            print(f"  params: {n.get('parameters', {})}")
PYEOF
