#!/bin/bash
echo "=== N8N Credentials Export ==="
docker exec -u node n8n n8n export:credentials --all --decrypted
