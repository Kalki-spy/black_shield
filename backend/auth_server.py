#!/usr/bin/env python3
"""
BlackShield Auth Server — SQLite-backed login & signup
Endpoints:
    POST /auth/signup    { username, email, password }
    POST /auth/login     { email, password }
    POST /auth/logout
    GET  /auth/me        (requires Authorization: Bearer <token>)
    GET  /auth/health
"""

import sqlite3
import hashlib
import re
import secrets
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT",8766))
DB_PATH = os.path.join(os.path.dirname(__file__), "blackshield.db")


# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                username  TEXT    NOT NULL,
                email     TEXT    NOT NULL UNIQUE,
                password  TEXT    NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token      TEXT    PRIMARY KEY,
                user_id    INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
    print(f"[Auth] Database ready at {DB_PATH}")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token() -> str:
    return secrets.token_hex(32)


# ── Auth Logic ────────────────────────────────────────────────────────────────

def signup(username: str, email: str, password: str):
    if not username or not email or not password:
        return 400, {"error": "username, email, and password are required"}
    if len(username.strip()) < 3:
        return 400, {"error": "Username must be at least 3 characters"}
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$', email.strip()):
        return 400, {"error": "Enter a valid email address"}
    if len(password) < 6:
        return 400, {"error": "Password must be at least 6 characters"}
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                (username.strip(), email.strip().lower(), hash_password(password))
            )
            conn.commit()
            user = conn.execute(
                "SELECT id, username, email FROM users WHERE email = ?",
                (email.strip().lower(),)
            ).fetchone()
            token = create_token()
            conn.execute(
                "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
                (token, user["id"])
            )
            conn.commit()
        return 200, {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"]}
        }
    except sqlite3.IntegrityError:
        return 409, {"error": "Email already registered"}
    except Exception as e:
        return 500, {"error": str(e)}


def login(email: str, password: str):
    if not email or not password:
        return 400, {"error": "email and password are required"}
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$', email.strip()):
        return 400, {"error": "Enter a valid email address"}
    try:
        with get_db() as conn:
            user = conn.execute(
                "SELECT id, username, email, password FROM users WHERE email = ?",
                (email.strip().lower(),)
            ).fetchone()
            if not user or user["password"] != hash_password(password):
                return 401, {"error": "Invalid email or password"}
            token = create_token()
            conn.execute(
                "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
                (token, user["id"])
            )
            conn.commit()
        return 200, {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"]}
        }
    except Exception as e:
        return 500, {"error": str(e)}


def logout(token: str):
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
        return 200, {"message": "Logged out"}
    except Exception as e:
        return 500, {"error": str(e)}


def get_me(token: str):
    if not token:
        return 401, {"error": "Not authenticated"}
    try:
        with get_db() as conn:
            row = conn.execute("""
                SELECT u.id, u.username, u.email
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ?
            """, (token,)).fetchone()
        if not row:
            return 401, {"error": "Invalid or expired session"}
        return 200, {"user": {"id": row["id"], "username": row["username"], "email": row["email"]}}
    except Exception as e:
        return 500, {"error": str(e)}


# ── HTTP Handler ──────────────────────────────────────────────────────────────

class AuthHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default logs

    def cors_headers(self):
        origin = self.headers.get("Origin", "")

        allowed = [
            "https://black-shield-icfy.vercel.app",
            "http://localhost:5173",
            "http://localhost:8080"
        ]

        self.send_header(
            "Access-Control-Allow-Origin",
            origin if origin in allowed else allowed[0]
        )
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
    def do_OPTIONS(self):
        self.send_response(200)
        self.cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def json_response(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length))

    def get_token(self) -> str:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
        return ""

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/auth/health":
            self.json_response(200, {"status": "ok"})
        elif path == "/auth/me":
            status, data = get_me(self.get_token())
            self.json_response(status, data)
        else:
            self.json_response(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_body()

        if path == "/auth/signup":
            status, data = signup(
                body.get("username", ""),
                body.get("email", ""),
                body.get("password", "")
            )
            self.json_response(status, data)
        elif path == "/auth/login":
            status, data = login(
                body.get("email", ""),
                body.get("password", "")
            )
            self.json_response(status, data)
        elif path == "/auth/logout":
            status, data = logout(self.get_token())
            self.json_response(status, data)
        else:
            self.json_response(404, {"error": "Not found"})


# ── Entry ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()

    HTTPServer.allow_reuse_address = True
    server = HTTPServer(("0.0.0.0", PORT), AuthHandler)

    print(f"[Auth] Running on port {PORT}")
    print("POST /auth/signup")
    print("POST /auth/login")
    print("POST /auth/logout")
    print("GET  /auth/me")
    print("GET  /auth/health")

    server.serve_forever()
