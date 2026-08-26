#!/bin/bash
# BlackShield — start everything with one command
# Usage: ./start.sh

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         BlackShield Platform             ║"
echo "║  Starting all services...                ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 not found. Please install Python 3."
  exit 1
fi

# Check Node / npm
if ! command -v npm &>/dev/null; then
  echo "[ERROR] npm not found. Please install Node.js."
  exit 1
fi

# Install Python deps if needed
echo "[*] Checking Python dependencies..."
pip install cryptography fastapi uvicorn groq pydantic --quiet --break-system-packages 2>/dev/null || \
pip install cryptography fastapi uvicorn groq pydantic --quiet 2>/dev/null || true

# Install npm deps if node_modules missing
if [ ! -d "node_modules" ]; then
  echo "[*] Installing npm dependencies..."
  npm install --silent
fi

echo "[*] Launching services..."
echo ""

# Use concurrently (already in devDeps)
npx concurrently \
  -n "VITE,AUTH,SSL,SUBDOMAIN,GOBUSTER,SQLI,SNIPER,CHAT" \
  -c "cyan,green,yellow,magenta,red,blue,white,gray" \
  "vite" \
  "python3 backend/auth_server.py" \
  "python3 backend/server.py" \
  "python3 backend/subdomain_server.py" \
  "python3 backend/gobuster_server.py" \
  "python3 backend/sqlmap_server.py" \
  "python3 backend/sniper_server.py" \
  "cd backend && uvicorn chatbot_server:app --port 8000 --log-level warning"
