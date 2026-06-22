#!/bin/bash
# Perbaiki Format Response code node dan Respond to Webhook node
# Format Response harus return array of items agar n8n bisa forward ke Respond to Webhook

echo "=== Update workflow dengan fix Code node ==="
python3 << 'PYEOF'
import json

with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json') as f:
    wf = json.load(f)

# Update Format Response code agar return proper n8n items array
for node in wf['nodes']:
    if node['name'] == 'Format Response':
        node['parameters']['jsCode'] = (
            "const items = $input.all().map(i => i.json);\n"
            "const grand_total = items.reduce((s, i) => s + parseFloat(i.total_nilai || 0), 0);\n"
            "return [{ json: { transfers: items, grand_total } }];"
        )
        print(f"Fixed Format Response code: {node['parameters']['jsCode']}")
    
    if node.get('type') == 'n8n-nodes-base.respondToWebhook':
        # Ubah respond node agar kirim json langsung dari input
        node['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ $json }}"
        }
        print(f"Updated Respond to Webhook params: {node['parameters']}")

with open('/home/n8n/workflows/ipos-transfer-bonus-v2.json', 'w') as f:
    json.dump(wf, f, indent=2)

print("Workflow updated!")
PYEOF

echo ""
echo "=== Import, aktifkan, restart ==="
docker cp /home/n8n/workflows/ipos-transfer-bonus-v2.json n8n-stack-n8n-1:/tmp/wf_v3.json
docker exec n8n-stack-n8n-1 sh -c "n8n import:workflow --input=/tmp/wf_v3.json 2>&1"
docker exec n8n-stack-postgres-1 sh -c "psql -U n8n -d n8n -c \"UPDATE workflow_entity SET active = true WHERE id = 'eKQiMYAoTxbNV1IU';\""
docker restart n8n-stack-n8n-1
sleep 10

echo ""
echo "=== Test webhook ==="
RESP=$(curl -s --max-time 20 "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Response:"
echo "$RESP" | head -c 800

echo ""
echo ""
echo "=== Jika masih async, coba test via webhook-test endpoint ==="
RESP2=$(curl -s --max-time 20 "http://localhost:5678/webhook-test/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All")
echo "Test endpoint response:"
echo "$RESP2" | head -c 800
