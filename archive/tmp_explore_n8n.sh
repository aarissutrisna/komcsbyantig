#!/bin/bash
echo "=== /home/n8n structure ==="
ls /home/n8n/ 2>/dev/null

echo ""
echo "=== Workflows in /home/n8n/workflows ==="
ls /home/n8n/workflows/ 2>/dev/null

echo ""
echo "=== Search for transfer-bonus workflow ==="
find /home/n8n /var/lib/n8n 2>/dev/null -name "*.json" | head -20

echo ""
echo "=== Try curl to get actual webhook response ==="
curl -s "http://localhost:5678/webhook/transfer-bonus-v2?startDate=2026-06-01&endDate=2026-06-19&direction=All" 2>&1 | head -200
