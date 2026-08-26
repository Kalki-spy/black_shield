#!/usr/bin/env python3
"""
CyberBot Chat Server — Ollama Edition
Runs a local AI model on YOUR machine. No API key, no internet, completely free.

SETUP:
1. Install Ollama: https://ollama.com/download
2. Pull a model: ollama pull llama3  (or mistral, phi3, gemma2)
3. Run this server — it connects to Ollama on localhost:11434

Endpoint: POST /chat  { messages: [{role, content}, ...] }
GET  /health  — shows Ollama status and loaded model
"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = 8000

# ── CONFIG ────────────────────────────────────────────────────────────────────
# Change this to whatever model you have pulled in Ollama.
# Run "ollama list" in terminal to see available models.
# Recommended: "llama3" (best), "mistral" (fast), "phi3" (lightweight)
OLLAMA_MODEL = "llama3"
OLLAMA_URL   = "http://localhost:11434"
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are CyberBot, an elite cybersecurity AI assistant for BlackShield — a professional cybersecurity analysis and penetration testing platform.

Your expertise covers:
- SSL/TLS certificate analysis and vulnerabilities
- Network scanning, port analysis, and service fingerprinting
- SQL injection detection and web application security
- Password cracking, hash analysis, and cryptography
- CVE vulnerabilities, CVSS scoring, and patch management
- DDoS attack types, detection, and mitigation
- Directory brute-forcing and web enumeration
- Subdomain discovery and DNS analysis
- Red team offensive techniques and Blue team defence
- CTF challenges and penetration testing methodology
- OWASP Top 10, MITRE ATT&CK framework

Rules:
- Be direct and technical — no filler phrases
- Use bullet points and code blocks for clarity
- Bold important terms and CVE IDs
- Answer cybersecurity questions thoroughly
- For BlackShield tool questions, explain how to use them effectively"""


def check_ollama():
    """Check if Ollama is running and the model is available."""
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            models = [m["name"].split(":")[0] for m in data.get("models", [])]
            return True, models
    except Exception as e:
        return False, []


def call_ollama(messages: list) -> str:
    """Send messages to Ollama and get a response."""
    # Build a single prompt from messages
    prompt_parts = [f"System: {SYSTEM_PROMPT}\n"]
    for msg in messages:
        role = "Human" if msg["role"] == "user" else "Assistant"
        prompt_parts.append(f"{role}: {msg['content']}")
    prompt_parts.append("Assistant:")
    full_prompt = "\n\n".join(prompt_parts)

    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 600,
        }
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
        return data.get("response", "").strip()


# ── HTTP Handler ──────────────────────────────────────────────────────────────
class ChatHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200); self._cors()
        self.send_header("Content-Length", "0"); self.end_headers()

    def _json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors(); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            running, models = check_ollama()
            self._json(200, {
                "status": "ok",
                "provider": "ollama",
                "model": OLLAMA_MODEL,
                "ollama_running": running,
                "available_models": models,
                "ready": running and any(OLLAMA_MODEL in m for m in models)
            })
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self):
        if urlparse(self.path).path != "/chat":
            self._json(404, {"error": "Not found"}); return

        length = int(self.headers.get("Content-Length", 0))
        body   = json.loads(self.rfile.read(length)) if length else {}
        messages = body.get("messages", [])

        if not messages:
            self._json(400, {"error": "No messages provided"}); return

        # Check Ollama is running first
        running, models = check_ollama()
        if not running:
            self._json(503, {
                "error": "Ollama is not running. Start it with: ollama serve",
                "fix": "1. Install Ollama from https://ollama.com/download\n2. Run: ollama serve\n3. Run: ollama pull llama3"
            }); return

        model_available = any(OLLAMA_MODEL in m for m in models)
        if not model_available:
            self._json(503, {
                "error": f"Model '{OLLAMA_MODEL}' not found in Ollama.",
                "fix": f"Run: ollama pull {OLLAMA_MODEL}",
                "available_models": models
            }); return

        try:
            reply = call_ollama(messages)
            self._json(200, {"reply": reply, "model": OLLAMA_MODEL, "provider": "ollama"})
        except urllib.error.URLError as e:
            self._json(503, {"error": f"Cannot connect to Ollama: {e}. Is 'ollama serve' running?"})
        except Exception as e:
            self._json(500, {"error": str(e)})


# ── Entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[CyberBot Ollama] Starting on port {PORT}")
    print(f"[CyberBot Ollama] Model: {OLLAMA_MODEL}")

    running, models = check_ollama()
    if not running:
        print(f"[CyberBot Ollama] WARNING: Ollama not detected at {OLLAMA_URL}")
        print(f"[CyberBot Ollama] Install: https://ollama.com/download")
        print(f"[CyberBot Ollama] Then run: ollama pull {OLLAMA_MODEL}")
    else:
        print(f"[CyberBot Ollama] Ollama running. Available models: {models}")
        if not any(OLLAMA_MODEL in m for m in models):
            print(f"[CyberBot Ollama] WARNING: '{OLLAMA_MODEL}' not pulled yet. Run: ollama pull {OLLAMA_MODEL}")
        else:
            print(f"[CyberBot Ollama] Ready!")

    HTTPServer.allow_reuse_address = True
    server = HTTPServer(("0.0.0.0", PORT), ChatHandler)
    server.serve_forever()