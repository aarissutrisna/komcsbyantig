#!/bin/bash
echo "=== tfitem.json sample (first 100 lines) ==="
head -100 /home/n8n/data/tfitem.json 2>/dev/null || echo "file not found"

echo ""
echo "=== tfitem-raw.json sample (first 50 lines) ==="
head -50 /home/n8n/data/tfitem-raw.json 2>/dev/null || echo "file not found"

echo ""
echo "=== Workflow JSON (ipos-transfer-bonus-v2.json) ==="
cat /home/n8n/workflows/ipos-transfer-bonus-v2.json
