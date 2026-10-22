"""Claude Pro & Antigravity usage reader for the widget."""

from __future__ import annotations

import base64
import ctypes
import hashlib
import json
import logging
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from ctypes import wintypes
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage"
CLAUDE_OAUTH_REFRESH_URL = "https://platform.claude.com/v1/oauth/token"
CLAUDE_OAUTH_BETA = "oauth-2025-04-20"
CLAUDE_USER_AGENT = "claude-code/1.0.0"

HOME_CLAUDE_JSON = Path.home() / ".claude.json"
HOME_CREDENTIALS = Path.home() / ".claude" / ".credentials.json"
# Remembers which token last worked and which are cooling down, keyed by a
# hash of the token (never the token itself), across runner processes.
STATE_FILE = Path(tempfile.gettempdir()) / "workday-claude-usage-state.json"
DEFAULT_RATE_LIMIT_COOLDOWN_S = 15 * 60
REJECTED_TOKEN_COOLDOWN_S = 6 * 60 * 60


class DATA_BLOB(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def find_claude_data_dir() -> Path | None:
    candidates: list[Path] = []
    # Newer Claude Desktop (MSIX) builds keep their data under
    # %LOCALAPPDATA%\Claude-Data\<package id> instead of the package's
    # LocalCache\Roaming\Claude folder.
    claude_data = Path(os.path.expandvars(r"%LOCALAPPDATA%\Claude-Data"))
    if claude_data.exists():
        candidates.extend(sorted(claude_data.glob("claude_*")))
        candidates.append(claude_data)
    local_packages = Path(os.path.expandvars(r"%LOCALAPPDATA%\Packages"))
    if local_packages.exists():
        candidates.extend(
            pkg / "LocalCache" / "Roaming" / "Claude"
            for pkg in local_packages.glob("Claude_*")
        )
    appdata = Path(os.path.expandvars(r"%APPDATA%\Claude"))
    if appdata.exists():
        candidates.append(appdata)
    for path in candidates:
        if (path / "config.json").exists() and (path / "Local State").exists():
            return path
    return None


def _dpapi_decrypt(data: bytes) -> bytes:
    in_blob = DATA_BLOB()
    buf = ctypes.create_string_buffer(data, len(data))
    in_blob.cbData = len(data)
    in_blob.pbData = ctypes.cast(buf, ctypes.POINTER(ctypes.c_byte))
    out_blob = DATA_BLOB()
    if not ctypes.windll.crypt32.CryptUnprotectData(
        ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)
    ):
        raise OSError("CryptUnprotectData failed")
    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)


def _chromium_aes_key(local_state: Path) -> bytes:
    state = json.loads(local_state.read_text(encoding="utf-8"))
    enc_key = base64.b64decode(state["os_crypt"]["encrypted_key"])
    if enc_key.startswith(b"DPAPI"):
        enc_key = enc_key[5:]
    return _dpapi_decrypt(enc_key)


def _decrypt_chromium_value(encrypted: bytes, key: bytes) -> bytes:
    if encrypted[:3] not in (b"v10", b"v11"):
        return _dpapi_decrypt(encrypted)
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    nonce = encrypted[3:15]
    ciphertext = encrypted[15:-16]
    tag = encrypted[-16:]
    return AESGCM(key).decrypt(nonce, ciphertext + tag, None)


def _decode_config_blob(value: str) -> bytes:
    raw = base64.b64decode(value)
    if raw[:3] in (b"v10", b"v11"):
        data_dir = find_claude_data_dir()
        if not data_dir:
            raise FileNotFoundError("Claude Desktop data directory not found")
        key = _chromium_aes_key(data_dir / "Local State")
        return _decrypt_chromium_value(raw, key)
    return _dpapi_decrypt(raw)


def _parse_desktop_config_file(config_path: Path) -> dict:
    text = config_path.read_text(encoding="utf-8").strip()
    if not text:
        return {}
    if text.startswith("{"):
        return json.loads(text)
    decrypted = _decode_config_blob(text)
    return json.loads(decrypted.decode("utf-8"))


def _load_desktop_oauth_cache(data_dir: Path) -> list[dict]:
    config_file = data_dir / "config.json"
    if not config_file.exists():
        return []
    try:
        data = _parse_desktop_config_file(config_file)
        entries = []
        for key in ("oauth:tokenCacheV2", "oauth:tokenCache"):
            blob = data.get(key)
            if not blob:
                continue
            if isinstance(blob, str):
                try:
                    decrypted_text = _decode_config_blob(blob).decode("utf-8")
                    parsed_cache = json.loads(decrypted_text)
                    if isinstance(parsed_cache, dict):
                        entries.extend(parsed_cache.values())
                except Exception:
                    pass
            elif isinstance(blob, dict):
                entries.extend(blob.values())
        return entries
    except Exception as exc:
        logger.warning("Failed to load Claude Desktop OAuth cache: %s", exc)
    return []


def _is_expired(expires_at) -> bool:
    try:
        return float(expires_at) <= datetime.now().timestamp() * 1000
    except (TypeError, ValueError):
        return False


def get_all_candidate_tokens() -> list[str]:
    """Unexpired tokens, freshest first. Expired tokens only produce 401s and
    burn requests against the rate-limited usage endpoint, so skip them."""
    # (has refresh token, expiry, token): desktop entries without a refresh
    # token are narrow-scope tokens that the usage endpoint rejects with 403.
    found: list[tuple[bool, float, str]] = []
    data_dir = find_claude_data_dir()
    if data_dir:
        for entry in _load_desktop_oauth_cache(data_dir):
            if isinstance(entry, dict):
                t = entry.get("token") or entry.get("accessToken")
                exp = entry.get("expiresAt")
                if t and not _is_expired(exp):
                    found.append((bool(entry.get("refreshToken")), float(exp or 0), t))

    if HOME_CREDENTIALS.exists():
        try:
            data = json.loads(HOME_CREDENTIALS.read_text(encoding="utf-8"))
            oauth = data.get("claudeAiOauth") or {}
            t = oauth.get("accessToken")
            exp = oauth.get("expiresAt")
            if t and not _is_expired(exp):
                found.append((True, float(exp or 0), t))
        except Exception:
            pass

    tokens: list[str] = []
    for _, _, t in sorted(found, key=lambda item: item[:2], reverse=True):
        if t not in tokens:
            tokens.append(t)
    return tokens


def get_account_info() -> dict:
    for path in (HOME_CLAUDE_JSON,):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        oauth_account = data.get("oauthAccount") or {}
        if oauth_account:
            return oauth_account
    return {}


def _request_usage(token: str) -> dict:
    req = urllib.request.Request(
        CLAUDE_USAGE_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "anthropic-beta": CLAUDE_OAUTH_BETA,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": CLAUDE_USER_AGENT,
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def _load_state() -> dict:
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if isinstance(state, dict):
            return state
    except Exception:
        pass
    return {}


def _save_state(state: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(state), encoding="utf-8")
    except Exception as exc:
        logger.warning("Failed to save Claude usage state: %s", exc)


def _retry_after_seconds(exc: urllib.error.HTTPError) -> int:
    try:
        return max(60, int(float(exc.headers.get("retry-after"))))
    except (TypeError, ValueError):
        return DEFAULT_RATE_LIMIT_COOLDOWN_S


def fetch_claude_usage() -> dict:
    """Fetch live usage from the Anthropic OAuth API.

    The usage endpoint rate-limits each token separately, so a 429 on one
    token puts only that token on hold (for its Retry-After) and the next
    token is tried. The token that last worked is tried first.
    """
    account = get_account_info()

    candidate_tokens = get_all_candidate_tokens()
    if not candidate_tokens:
        return {
            "usage": None,
            "account": account,
            "status": "not_authenticated",
            "error": "No valid Claude sign-in found. Open Claude Desktop or run `claude` to sign in again.",
        }

    now = datetime.now().timestamp()
    state = _load_state()
    limited = {fp: t for fp, t in (state.get("limited") or {}).items() if t > now}
    rejected = {fp: t for fp, t in (state.get("rejected") or {}).items() if t > now}
    last_good = state.get("last_good")
    candidates = sorted(candidate_tokens, key=lambda t: _fingerprint(t) != last_good)

    last_err = None
    for token in candidates:
        fp = _fingerprint(token)
        if fp in limited or fp in rejected:
            continue
        try:
            usage = _request_usage(token)
            if usage:
                _save_state({"last_good": fp, "limited": limited, "rejected": rejected})
                return {"usage": usage, "account": account, "status": "ok", "error": None}
        except urllib.error.HTTPError as exc:
            last_err = exc
            if exc.code == 429:
                limited[fp] = now + _retry_after_seconds(exc)
            elif exc.code in (401, 403):
                rejected[fp] = now + REJECTED_TOKEN_COOLDOWN_S
        except Exception as exc:
            last_err = exc

    _save_state({"last_good": last_good, "limited": limited, "rejected": rejected})
    current = {_fingerprint(t) for t in candidates}
    waits = [t for fp, t in limited.items() if fp in current]
    if waits:
        wait_min = max(1, round((min(waits) - now) / 60))
        error = f"HTTP Error 429: Too Many Requests (Claude sign-ins are rate limited; retrying in about {wait_min} min)"
    else:
        error = str(last_err) if last_err else "No usable Claude sign-in right now."
    return {"usage": None, "account": account, "status": "error", "error": error}
