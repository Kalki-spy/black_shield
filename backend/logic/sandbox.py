"""
Sandbox target allowlist.

Every scanning tool in this app (network analyzer, port scanner, directory
brute-forcer, SQLi scanner, nmap, metasploit-style scanner, sniper, SSL
tools) must resolve its target through resolve_target() before doing any
real network activity. If a target isn't on this list, the request is
rejected — server-side, not just in the UI, since a frontend-only check is
trivially bypassed with curl/Postman.

The targets below are all long-standing, publicly-documented test hosts
that their owners explicitly provide FOR security-tool testing:

- scanme.nmap.org: run by the Nmap Project specifically to be scanned.
  Their own docs say so directly: "You may scan this host, we ask that you
  not overdo it though" (see https://nmap.org/book/legal-issues.html
  and https://scanme.nmap.org).
- testphp.vulnweb.com: Acunetix's intentionally-vulnerable PHP test site,
  published specifically for security scanner testing/demos.
- demo.testfire.net: IBM's "Altoro Mutual" demo banking app, an
  intentionally-vulnerable application IBM publishes for the same purpose.

Do not add arbitrary hosts here. Adding a real, non-consenting third-party
target here would defeat the entire point of this allowlist.
"""

from urllib.parse import urlparse

SANDBOX_TARGETS = {
    "blackshield-local": {
        "label": "BlackShield's own sandbox app — always available, zero risk",
        "host": "__self__",
        "kind": "web",
        "notes": "Fake routes served by this app itself. No real database or vulnerability — recommended default since the external sites below can be blocked by their own WAF for cloud-hosted traffic.",
    },
    "scanme-nmap": {
        "label": "scanme.nmap.org — Nmap Project's official scan-test host",
        "host": "scanme.nmap.org",
        "kind": "network",
        "notes": "Explicitly authorized by the Nmap Project for scanning practice.",
    },
    "vulnweb-testphp": {
        "label": "testphp.vulnweb.com — Acunetix intentionally-vulnerable test site",
        "host": "testphp.vulnweb.com",
        "kind": "web",
        "notes": "Published by Acunetix for security-scanner testing; contains known SQLi/XSS test cases. May block requests from cloud/datacenter IPs.",
    },
    "testfire-altoro": {
        "label": "demo.testfire.net — IBM Altoro Mutual demo banking app",
        "host": "demo.testfire.net",
        "kind": "web",
        "notes": "IBM's publicly-authorized intentionally-vulnerable demo application. May block requests from cloud/datacenter IPs.",
    },
}

BLOCKED_MSG = (
    "This tool only runs against approved sandbox targets, not arbitrary "
    "hosts. Pick one from the dropdown."
)


def list_targets(kind: str | None = None):
    return [
        {"id": k, **v}
        for k, v in SANDBOX_TARGETS.items()
        if kind is None or v["kind"] == kind
    ]


def resolve_target(raw: str) -> str | None:
    """
    Accepts a sandbox target id (e.g. 'scanme-nmap'), a bare hostname, or a
    full URL. Returns the canonical approved hostname if — and only if —
    it matches an entry in SANDBOX_TARGETS. Returns None otherwise, which
    every caller must treat as "reject this request".
    """
    if not raw:
        return None
    raw = raw.strip().lower()

    if raw in SANDBOX_TARGETS:
        host = SANDBOX_TARGETS[raw]["host"]
        return host if host != "__self__" else None

    candidate = raw
    if "://" in candidate:
        candidate = urlparse(candidate).hostname or ""
    else:
        candidate = candidate.split("/")[0].split(":")[0]

    for entry in SANDBOX_TARGETS.values():
        if candidate == entry["host"]:
            return entry["host"]

    return None


def resolve_target_url(raw: str, default_scheme: str = "http", self_host: str | None = None, self_path: str = "/sandbox/") -> str | None:
    """
    Like resolve_target, but for tools that need a full URL (gobuster,
    sqlmap, ssl analyzer) rather than a bare host. Rebuilds a clean URL
    using ONLY the approved host — any path/query the caller supplied on
    an approved host is preserved, but the host itself is always the
    canonical allowlisted one (never attacker-influenced).

    self_host: pass the current request's own host (e.g. request.host)
    to allow resolving the special self-hosted 'blackshield-local'
    sandbox app target. Without it, that target is rejected.
    self_path: which path on the self-hosted sandbox app to point at —
    callers that need a specific endpoint (e.g. SQLMap needs the
    parameterized login.php, Gobuster needs the directory root) pass this.
    """
    if not raw:
        return None
    raw_stripped = raw.strip()
    key = raw_stripped.lower()

    if key in SANDBOX_TARGETS:
        host = SANDBOX_TARGETS[key]["host"]
        if host == "__self__":
            if not self_host:
                return None
            return f"{default_scheme}://{self_host}{self_path}"
        return f"{default_scheme}://{host}/"

    host = resolve_target(raw_stripped)
    if not host:
        return None

    if "://" in raw_stripped:
        parsed = urlparse(raw_stripped)
        scheme = parsed.scheme or default_scheme
        path = parsed.path or "/"
        query = f"?{parsed.query}" if parsed.query else ""
        return f"{scheme}://{host}{path}{query}"

    return f"{default_scheme}://{host}/"
