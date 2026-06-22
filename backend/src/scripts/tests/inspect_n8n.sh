#!/bin/bash
echo "=== N8N Container Env ==="
docker inspect n8n | grep -i key
docker inspect n8n | grep -i encrypt
