#!/bin/bash
# Fix n8n workflow: ubah responseMode dari "responseNode" ke "lastNode"
# agar webhook langsung return data dari PostgreSQL query

WORKFLOW_FILE="/home/n8n/workflows/ipos-transfer-bonus-v2.json"
BACKUP_FILE="/home/n8n/workflows/ipos-transfer-bonus-v2.json.bak.$(date +%Y%m%d%H%M%S)"

echo "=== Backup workflow ==="
cp "$WORKFLOW_FILE" "$BACKUP_FILE"
echo "Backup saved to: $BACKUP_FILE"

echo ""
echo "=== Current responseMode ==="
python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
for node in wf.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.webhook':
        print('Webhook params:', json.dumps(node.get('parameters', {}), indent=2))
"

echo ""
echo "=== Patching responseMode to lastNode ==="
python3 -c "
import json

with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)

# Patch nodes list
for node in wf.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.webhook':
        node['parameters']['options']['responseMode'] = 'lastNode'
        print('Patched node:', node['name'])

# Patch activeVersion nodes if present
av = wf.get('activeVersion', {})
if av:
    for node in av.get('nodes', []):
        if node.get('type') == 'n8n-nodes-base.webhook':
            node['parameters']['options']['responseMode'] = 'lastNode'
            print('Patched activeVersion node:', node['name'])

with open('$WORKFLOW_FILE', 'w') as f:
    json.dump(wf, f, indent=2)

print('Done. File written.')
"

echo ""
echo "=== Verify patch ==="
python3 -c "
import json
with open('$WORKFLOW_FILE') as f:
    wf = json.load(f)
for node in wf.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.webhook':
        print('responseMode:', node['parameters']['options'].get('responseMode'))
"

echo ""
echo "=== Reloading workflow via n8n API ==="
# Get n8n API key from env or config
N8N_API_KEY=$(docker exec n8n-stack-n8n-1 sh -c 'echo $N8N_API_KEY' 2>/dev/null || echo "")
echo "API key found: $([ -n "$N8N_API_KEY" ] && echo YES || echo NO)"

# Try import via n8n CLI inside container
echo "Importing workflow via n8n container CLI..."
docker exec n8n-stack-n8n-1 sh -c "
  n8n import:workflow --input=/data 2>&1 | tail -5
" 2>&1 || echo "CLI import not available"

echo ""
echo "=== Current tfitem.json content ==="
head -50 /home/n8n/data/tfitem.json 2>/dev/null || echo "empty or not found"
