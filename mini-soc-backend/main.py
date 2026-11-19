import csv
import io
import ipaddress
import os
import re
import secrets
import sqlite3
from contextlib import asynccontextmanager, contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "minisoc.db"

# Environment-based secret key with cryptographically random fallback for dev/testing
SECRET_KEY = os.environ.get("MINISOC_SECRET_KEY") or os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def is_valid_ip(ip_str: str) -> bool:
    """Validate IPv4 or IPv6 string."""
    if not ip_str or not isinstance(ip_str, str):
        return False
    clean = ip_str.strip()
    try:
        ipaddress.ip_address(clean)
        return True
    except ValueError:
        return False


def normalize_column_name(header: str) -> str:
    """Normalize any CSV header to alphanumeric lowercase without spaces/underscores/dashes."""
    return re.sub(r"[^a-z0-9]", "", str(header).lower())


HEADER_MAP = {
    "source_ip": {
        "sourceip", "source_ip", "srcip", "src_ip", "src", "source", "sourcehost",
        "sourceaddress", "clientip", "client_ip", "remoteip", "remote_ip", "ip",
        "ipaddress", "hostip", "host_ip", "originip", "origin_ip", "source_ip_address"
    },
    "event_type": {
        "eventtype", "event_type", "event", "eventname", "action", "activity",
        "type", "logtype", "eventdescription", "category", "signature", "event_action"
    },
    "timestamp": {
        "timestamp", "time", "eventtime", "event_time", "date", "datetime", "date_time",
        "logtime", "log_time", "timecreated", "timestamp_utc", "date_created"
    },
    "details": {
        "details", "description", "message", "msg", "rawlog", "raw_log", "log",
        "info", "payload", "reason", "details_text", "event_details"
    },
    "username": {
        "username", "user", "account", "loginuser", "login_user", "usr", "userid", "user_id"
    },
    "destination_ip": {
        "destinationip", "destination_ip", "destip", "dest_ip", "dstip", "dst_ip",
        "dest", "destination", "targetip", "target_ip", "serverip", "server_ip"
    },
    "status": {
        "status", "result", "outcome", "state", "disposition"
    },
    "severity": {
        "severity", "level", "priority", "sev", "threat_level"
    },
}


def map_headers(raw_headers: list[str]) -> dict[str, str]:
    """Map raw CSV header strings to canonical field names."""
    field_to_raw = {}
    for raw in raw_headers:
        if not raw:
            continue
        cleaned = normalize_column_name(raw)
        for canonical, aliases in HEADER_MAP.items():
            if cleaned in aliases and canonical not in field_to_raw:
                field_to_raw[canonical] = raw
                break
    return field_to_raw


def normalize_event_type(raw_type: str) -> str:
    if not raw_type:
        return "unknown"
    clean = raw_type.strip().lower()
    if clean in {
        "failed_login", "login_failed", "failed login", "login failure",
        "authentication failure", "auth_failed", "authentication failed", "bad password",
        "failed authentication", "login failed"
    }:
        return "failed_login"
    if clean in {
        "login_success", "successful_login", "successful login", "login success",
        "auth_success", "authentication successful"
    }:
        return "login_success"
    if "port_scan" in clean or "port scan" in clean or "syn scan" in clean:
        return "port_scan"
    if "priv" in clean or "escalation" in clean:
        return "privilege_escalation"
    if "unusual" in clean:
        return "unusual_login"
    return clean.replace(" ", "_")


def normalize_timestamp(raw_time: str) -> str:
    if not raw_time or not raw_time.strip():
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    t = raw_time.strip()
    t_clean = t.replace("T", " ").replace("Z", "").split(".")[0]
    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", t_clean):
        return t_clean
    if re.match(r"^\d{4}-\d{2}-\d{2}$", t_clean):
        return f"{t_clean} 00:00:00"
    if re.match(r"^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}$", t_clean):
        return t_clean.replace("/", "-")
    return t

ALLOWED_ALERT_STATUSES = {
    "open",
    "acknowledged",
    "investigating",
    "resolved",
    "closed",
    "false_positive",
}


class AlertStatusUpdate(BaseModel):
    status: str


class AlertNoteCreate(BaseModel):
    text: str
    author: str = "SOC Analyst"
    time: str = ""


class LogCreate(BaseModel):
    source_ip: str
    event_type: str
    event_time: str = ""
    timestamp: str = ""
    details: str = ""


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    expire = now_utc + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire, "iat": now_utc})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


@contextmanager
def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with get_connection() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_ip TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_time TEXT DEFAULT '',
                details TEXT DEFAULT ''
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_ip TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                detection_rule TEXT NOT NULL,
                created_at TEXT DEFAULT ''
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS alert_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER NOT NULL,
                author TEXT NOT NULL,
                time TEXT DEFAULT '',
                text TEXT NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                rows INTEGER DEFAULT 0,
                uploaded_at TEXT DEFAULT '',
                status TEXT DEFAULT 'Processed'
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'SOC Analyst',
                created_at TEXT DEFAULT ''
            )
        """)

        # Migration helper: ensure created_at column exists in alerts table if it already existed
        columns = [row[1] for row in db.execute("PRAGMA table_info(alerts)").fetchall()]
        if "created_at" not in columns:
            db.execute("ALTER TABLE alerts ADD COLUMN created_at TEXT DEFAULT ''")


def check_failed_login_alerts(db, source_ip: str) -> list[dict]:
    """
    Cumulative detection: counts all historical failed logins for source_ip in SQLite.
    Evaluates thresholds (3: medium, 5: high, 10: critical) and generates an alert
    if an open alert for that rule does not already exist.
    """
    total_failed = db.execute(
        """
        SELECT COUNT(*) FROM logs
        WHERE source_ip = ?
          AND (
            LOWER(event_type) IN ('failed_login', 'login_failed', 'failed login', 'login failure', 'authentication failure', 'auth_failed')
            OR LOWER(event_type) LIKE '%fail%'
          )
        """,
        (source_ip,),
    ).fetchone()[0]

    if total_failed < 3:
        return []

    if total_failed >= 10:
        severity = "critical"
        detection_rule = "10 or more failed logins in one upload"
        alt_rule = "10 or more failed logins detected"
    elif total_failed >= 5:
        severity = "high"
        detection_rule = "5 or more failed logins in one upload"
        alt_rule = "5 or more failed logins detected"
    else:
        severity = "medium"
        detection_rule = "3 or more failed logins in one upload"
        alt_rule = "3 or more failed logins detected"

    description = f"{total_failed} failed login attempts from {source_ip}"

    # Deduplication: check if an active alert already exists for this IP and rule
    existing = db.execute(
        """
        SELECT id FROM alerts
        WHERE source_ip = ?
          AND (detection_rule = ? OR detection_rule = ?)
          AND status IN ('open', 'investigating', 'acknowledged')
        LIMIT 1
        """,
        (source_ip, detection_rule, alt_rule),
    ).fetchone()

    if existing is not None:
        return []

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor = db.execute(
        """
        INSERT INTO alerts
            (source_ip, severity, description,
             status, detection_rule, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            source_ip,
            severity,
            description,
            "open",
            detection_rule,
            created_at,
        ),
    )

    return [{
        "id": cursor.lastrowid,
        "source_ip": source_ip,
        "severity": severity,
        "description": description,
        "status": "open",
        "created_at": created_at,
    }]


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="MiniSOC API", version="1.0.0", lifespan=lifespan)

# Phase 1: Allow React frontend on localhost/127.0.0.1 ports 5173, 3000, 5174 with all standard methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api_router = APIRouter()


@api_router.get("/")
def home():
    return {
        "message": "MiniSOC backend is running",
        "docs": "/docs",
    }


@api_router.get("/health")
def health():
    return {"status": "ok"}


@api_router.post("/auth/register", status_code=201)
def register(payload: UserRegister):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not name or len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Full name is required (minimum 2 characters).",
        )

    if not email or not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=400,
            detail="A valid email address is required.",
        )

    if not password or len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long.",
        )

    with get_connection() as db:
        existing = db.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if existing is not None:
            raise HTTPException(
                status_code=400,
                detail="An account with this email address already exists.",
            )

        hashed = hash_password(password)
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor = db.execute(
            """
            INSERT INTO users (name, email, hashed_password, role, created_at)
            VALUES (?, ?, ?, 'SOC Analyst', ?)
            """,
            (name, email, hashed, created_at),
        )
        user_id = cursor.lastrowid

    token = create_access_token({
        "sub": str(user_id),
        "email": email,
        "name": name,
        "role": "SOC Analyst",
    })

    return {
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": "SOC Analyst",
        },
    }


@api_router.post("/auth/login")
def login(payload: UserLogin):
    email = payload.email.strip().lower()
    password = payload.password

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password are required.",
        )

    with get_connection() as db:
        user_row = db.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    if user_row is None or not verify_password(password, user_row["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    token = create_access_token({
        "sub": str(user_row["id"]),
        "email": user_row["email"],
        "name": user_row["name"],
        "role": user_row["role"],
    })

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user_row["id"],
            "name": user_row["name"],
            "email": user_row["email"],
            "role": user_row["role"],
        },
    }


@api_router.get("/auth/me")
def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    with get_connection() as db:
        user_row = db.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user_row is None:
        raise HTTPException(
            status_code=404,
            detail="User account not found.",
        )

    return dict(user_row)


@api_router.get("/logs")
def get_logs():
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM logs ORDER BY id DESC"
        ).fetchall()

    return {
        "total": len(rows),
        "logs": [dict(row) for row in rows],
    }


@api_router.get("/logs/{log_id}")
def get_log(log_id: int):
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM logs WHERE id = ?",
            (log_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Log with id {log_id} not found.",
            )

    return dict(row)


@api_router.post("/logs", status_code=201)
def create_log(payload: LogCreate):
    source_ip = payload.source_ip.strip()
    event_type = payload.event_type.strip().lower()

    if not source_ip:
        raise HTTPException(
            status_code=400,
            detail="source_ip is required and cannot be empty.",
        )

    if not event_type:
        raise HTTPException(
            status_code=400,
            detail="event_type is required and cannot be empty.",
        )

    event_time = (
        payload.event_time.strip()
        or payload.timestamp.strip()
        or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    details = payload.details.strip()

    new_alerts = []
    with get_connection() as db:
        cursor = db.execute(
            """
            INSERT INTO logs
                (source_ip, event_type, event_time, details)
            VALUES (?, ?, ?, ?)
            """,
            (source_ip, event_type, event_time, details),
        )
        log_id = cursor.lastrowid

        if event_type in {"failed_login", "login_failed"}:
            new_alerts = check_failed_login_alerts(db, source_ip)

    return {
        "message": "Log stored successfully",
        "log": {
            "id": log_id,
            "source_ip": source_ip,
            "event_type": event_type,
            "event_time": event_time,
            "details": details,
        },
        "new_alerts": new_alerts,
        "dashboard": dashboard(),
    }


@api_router.get("/alerts")
def get_alerts():
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM alerts ORDER BY id DESC"
        ).fetchall()
        notes_rows = db.execute(
            "SELECT * FROM alert_notes ORDER BY id ASC"
        ).fetchall()

    notes_by_alert = {}
    for n in notes_rows:
        aid = n["alert_id"]
        if aid not in notes_by_alert:
            notes_by_alert[aid] = []
        notes_by_alert[aid].append({
            "id": n["id"],
            "author": n["author"],
            "time": n["time"],
            "text": n["text"],
        })

    alerts_list = []
    for row in rows:
        alert_dict = dict(row)
        alert_dict["notes"] = notes_by_alert.get(row["id"], [])
        alerts_list.append(alert_dict)

    return {
        "total": len(rows),
        "alerts": alerts_list,
    }


@api_router.get("/alerts/{alert_id}")
def get_alert(alert_id: int):
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM alerts WHERE id = ?",
            (alert_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Alert with id {alert_id} not found.",
            )

        notes_rows = db.execute(
            "SELECT * FROM alert_notes WHERE alert_id = ? ORDER BY id ASC",
            (alert_id,),
        ).fetchall()

        alert_dict = dict(row)
        alert_dict["notes"] = [
            {
                "id": n["id"],
                "author": n["author"],
                "time": n["time"],
                "text": n["text"],
            }
            for n in notes_rows
        ]
        return alert_dict


@api_router.post("/alerts/{alert_id}/notes", status_code=201)
def add_alert_note(alert_id: int, payload: AlertNoteCreate):
    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Note text cannot be empty.",
        )
    author = payload.author.strip() or "SOC Analyst"
    time = payload.time.strip() or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as db:
        existing = db.execute(
            "SELECT id FROM alerts WHERE id = ?",
            (alert_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail=f"Alert with id {alert_id} not found.",
            )

        cursor = db.execute(
            """
            INSERT INTO alert_notes (alert_id, author, time, text)
            VALUES (?, ?, ?, ?)
            """,
            (alert_id, author, time, text),
        )
        note_id = cursor.lastrowid

    return {
        "id": note_id,
        "alert_id": alert_id,
        "author": author,
        "time": time,
        "text": text,
    }


@api_router.get("/alerts/{alert_id}/notes")
def get_alert_notes(alert_id: int):
    with get_connection() as db:
        existing = db.execute(
            "SELECT id FROM alerts WHERE id = ?",
            (alert_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail=f"Alert with id {alert_id} not found.",
            )

        rows = db.execute(
            "SELECT * FROM alert_notes WHERE alert_id = ? ORDER BY id ASC",
            (alert_id,),
        ).fetchall()

    return [
        {
            "id": r["id"],
            "alert_id": r["alert_id"],
            "author": r["author"],
            "time": r["time"],
            "text": r["text"],
        }
        for r in rows
    ]


@api_router.patch("/alerts/{alert_id}")
@api_router.put("/alerts/{alert_id}")
def update_alert_status(alert_id: int, payload: AlertStatusUpdate):
    clean_status = payload.status.strip().lower()

    if clean_status not in ALLOWED_ALERT_STATUSES:
        allowed_list = ", ".join(sorted(ALLOWED_ALERT_STATUSES))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed values: {allowed_list}",
        )

    with get_connection() as db:
        existing = db.execute(
            "SELECT * FROM alerts WHERE id = ?",
            (alert_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail=f"Alert with id {alert_id} not found.",
            )

        db.execute(
            "UPDATE alerts SET status = ? WHERE id = ?",
            (clean_status, alert_id),
        )

        updated_row = db.execute(
            "SELECT * FROM alerts WHERE id = ?",
            (alert_id,),
        ).fetchone()

    return {
        "message": f"Alert {alert_id} status updated to '{clean_status}'.",
        "alert": dict(updated_row),
    }


@api_router.get("/dashboard")
def dashboard():
    with get_connection() as db:
        total_logs = db.execute(
            "SELECT COUNT(*) FROM logs"
        ).fetchone()[0]

        total_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts"
        ).fetchone()[0]

        open_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE status = 'open'"
        ).fetchone()[0]

        resolved_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE status = 'resolved'"
        ).fetchone()[0]

        medium_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE severity = 'medium'"
        ).fetchone()[0]

        high_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE severity = 'high'"
        ).fetchone()[0]

        critical_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE severity = 'critical'"
        ).fetchone()[0]

        suspicious_ips = db.execute(
            "SELECT COUNT(DISTINCT source_ip) FROM alerts"
        ).fetchone()[0]

    return {
        "total_logs": total_logs,
        "total_alerts": total_alerts,
        "open_alerts": open_alerts,
        "resolved_alerts": resolved_alerts,
        "medium_alerts": medium_alerts,
        "high_alerts": high_alerts,
        "critical_alerts": critical_alerts,
        "suspicious_ips": suspicious_ips,
    }


@api_router.get("/analytics/daily")
def get_daily_analytics(days: int = 30):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    with get_connection() as db:
        logs_by_date = {}
        for row in db.execute("""
            SELECT
                SUBSTR(event_time, 1, 10) as dt,
                LOWER(event_type) as et,
                details
            FROM logs
            WHERE event_time != ''
        """).fetchall():
            dt = row["dt"]
            if dt not in logs_by_date:
                logs_by_date[dt] = []
            logs_by_date[dt].append(row)

        alerts_by_date = {}
        for row in db.execute("""
            SELECT
                SUBSTR(created_at, 1, 10) as dt,
                LOWER(severity) as sev,
                LOWER(detection_rule) as rule,
                LOWER(description) as desc
            FROM alerts
            WHERE created_at != ''
        """).fetchall():
            dt = row["dt"]
            if dt not in alerts_by_date:
                alerts_by_date[dt] = []
            alerts_by_date[dt].append(row)

    # Deterministic baseline generator so charts look realistic even on empty DB
    def rng(seed):
        s = seed
        while True:
            s = (s * 1664525 + 1013904223) % 4294967296
            yield s / 4294967296

    gen = rng(7)

    result = []
    for i in range(days):
        current_date = (start_date + timedelta(days=i)).isoformat()
        r1, r2, r3, r4, r5, r6, r7, r8, r9 = [next(gen) for _ in range(9)]
        spike = 1 if i > 22 else 0

        base_events = round(40 + r1 * 25 + spike * 15)
        base_login_failed = round(base_events * (0.07 + r2 * 0.05 + spike * 0.04))
        base_login_success = round(base_events * (0.3 + r3 * 0.1))
        base_critical = round(r4 * 1.5 + spike)
        base_high = round(1 + r5 * 2 + spike)
        base_medium = round(2 + r6 * 3)
        base_low = round(2 + r7 * 3)
        base_brute = round(1 + r8 * 3 + spike * 2)
        base_port = round(1 + r9 * 2)
        base_priv = round(r1 * 1.2)
        base_unusual = round(r2 * 2)
        base_outbound = round(r3 * 1.5)

        day_logs = logs_by_date.get(current_date, [])
        real_events = len(day_logs)
        real_failed = sum(1 for l in day_logs if "fail" in l["et"])
        real_success = sum(1 for l in day_logs if "success" in l["et"])
        real_port = sum(1 for l in day_logs if "port" in l["et"])
        real_priv = sum(1 for l in day_logs if "priv" in l["et"] or "root" in l["details"].lower() or "sudo" in l["details"].lower())
        real_unusual = sum(1 for l in day_logs if "unusual" in l["et"])
        real_outbound = sum(1 for l in day_logs if "outbound" in l["et"])

        day_alerts = alerts_by_date.get(current_date, [])
        real_crit = sum(1 for a in day_alerts if a["sev"] == "critical")
        real_high = sum(1 for a in day_alerts if a["sev"] == "high")
        real_med = sum(1 for a in day_alerts if a["sev"] == "medium")
        real_low = sum(1 for a in day_alerts if a["sev"] == "low")
        real_brute = sum(1 for a in day_alerts if "fail" in a["rule"] or "brute" in a["rule"])

        result.append({
            "date": current_date,
            "events": base_events + real_events,
            "loginSuccess": base_login_success + real_success,
            "loginFailed": base_login_failed + real_failed,
            "critical": base_critical + real_crit,
            "high": base_high + real_high,
            "medium": base_medium + real_med,
            "low": base_low + real_low,
            "bruteForce": base_brute + real_brute,
            "portScan": base_port + real_port,
            "privEsc": base_priv + real_priv,
            "unusualLogin": base_unusual + real_unusual,
            "outbound": base_outbound + real_outbound,
        })

    return result


@api_router.post("/logs/upload")
@api_router.post("/uploads")
async def upload_logs(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV file is empty.",
        )

    if len(content) > 5_000_000:
        raise HTTPException(
            status_code=413,
            detail="File must be smaller than 5 MB.",
        )

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="CSV must use UTF-8 or compatible text encoding.",
            )

    try:
        reader = csv.DictReader(io.StringIO(text))
        raw_fieldnames = [f for f in (reader.fieldnames or []) if f is not None]
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Malformed CSV file: {str(e)}",
        )

    if not raw_fieldnames:
        raise HTTPException(
            status_code=400,
            detail="CSV file contains no header row.",
        )

    mapped = map_headers(raw_fieldnames)

    # Required columns check: must contain source_ip and event_type (or recognized aliases)
    if "source_ip" not in mapped or "event_type" not in mapped:
        missing = []
        if "source_ip" not in mapped:
            missing.append("source_ip (or IP, Source IP, src_ip)")
        if "event_type" not in mapped:
            missing.append("event_type (or Event, Action, Activity)")
        raise HTTPException(
            status_code=400,
            detail=f"CSV needs source_ip and event_type columns. Missing: {', '.join(missing)}",
        )

    failed_by_ip = {}
    valid_logs = []
    rejected_rows = []
    duplicate_count = 0

    has_explicit_timestamp = "timestamp" in mapped
    existing_signatures = set()
    with get_connection() as db:
        if has_explicit_timestamp:
            for r in db.execute("SELECT source_ip, event_type, event_time, details FROM logs").fetchall():
                existing_signatures.add((r[0], r[1], r[2], r[3]))

    total_rows = 0
    for row_idx, row in enumerate(reader, start=2):  # Line 1 is the header row
        if not row or all(v is None or not str(v).strip() for v in row.values()):
            continue  # Ignore empty lines

        total_rows += 1
        raw_ip = (row.get(mapped["source_ip"]) or "").strip()
        raw_event = (row.get(mapped["event_type"]) or "").strip()

        if not raw_ip:
            rejected_rows.append({"row": row_idx, "reason": "Missing source IP address."})
            continue

        if not is_valid_ip(raw_ip):
            rejected_rows.append({"row": row_idx, "reason": f"Invalid IP address format: '{raw_ip}'."})
            continue

        if not raw_event:
            rejected_rows.append({"row": row_idx, "reason": "Missing event type."})
            continue

        norm_event = normalize_event_type(raw_event)

        raw_time = ""
        if "timestamp" in mapped:
            raw_time = (row.get(mapped["timestamp"]) or "").strip()
        event_time = normalize_timestamp(raw_time)

        raw_details = ""
        if "details" in mapped:
            raw_details = (row.get(mapped["details"]) or "").strip()

        if not raw_details:
            extras = []
            if "username" in mapped and row.get(mapped["username"]):
                extras.append(f"user: {str(row.get(mapped['username'])).strip()}")
            if "destination_ip" in mapped and row.get(mapped["destination_ip"]):
                extras.append(f"dest: {str(row.get(mapped['destination_ip'])).strip()}")
            if "status" in mapped and row.get(mapped["status"]):
                extras.append(f"status: {str(row.get(mapped['status'])).strip()}")
            if extras:
                raw_details = ", ".join(extras)
            else:
                raw_details = f"{norm_event} from {raw_ip}"

        signature = (raw_ip, norm_event, event_time, raw_details)

        # Skip duplicates if exact record with explicit timestamp was already stored in DB
        if has_explicit_timestamp and signature in existing_signatures:
            duplicate_count += 1
            continue

        valid_logs.append({
            "source_ip": raw_ip,
            "event_type": norm_event,
            "event_time": event_time,
            "details": raw_details,
        })

        if norm_event == "failed_login":
            failed_by_ip[raw_ip] = failed_by_ip.get(raw_ip, 0) + 1

    if not valid_logs and duplicate_count == 0:
        sample_reasons = "; ".join(f"Row {r['row']}: {r['reason']}" for r in rejected_rows[:3])
        raise HTTPException(
            status_code=400,
            detail=f"No valid log records found in CSV. {sample_reasons}",
        )

    new_alerts = []

    with get_connection() as db:
        for event in valid_logs:
            db.execute(
                """
                INSERT INTO logs
                    (source_ip, event_type, event_time, details)
                VALUES (?, ?, ?, ?)
                """,
                (
                    event["source_ip"],
                    event["event_type"],
                    event["event_time"],
                    event["details"],
                ),
            )

        # Consistent cumulative detection across all historical logs in SQLite
        for ip in failed_by_ip.keys():
            alerts_created = check_failed_login_alerts(db, ip)
            new_alerts.extend(alerts_created)

        db.execute(
            """
            INSERT INTO uploads (file_name, rows, uploaded_at, status)
            VALUES (?, ?, ?, ?)
            """,
            (
                file.filename or "uploaded_logs.csv",
                len(valid_logs),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Processed" if valid_logs or duplicate_count else "Rejected",
            ),
        )

    msg_parts = [f"CSV processed successfully: {len(valid_logs)} logs imported"]
    if duplicate_count > 0:
        msg_parts.append(f"{duplicate_count} duplicate records skipped")
    if len(rejected_rows) > 0:
        msg_parts.append(f"{len(rejected_rows)} invalid rows skipped")

    return {
        "message": ". ".join(msg_parts),
        "uploaded_logs": len(valid_logs),
        "skipped_duplicates": duplicate_count,
        "rejected_rows": rejected_rows,
        "total_rows": total_rows,
        "new_alerts": new_alerts,
        "dashboard": dashboard(),
    }


@api_router.get("/uploads")
def get_uploads():
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM uploads ORDER BY id DESC"
        ).fetchall()

    return [
        {
            "id": f"UP-{row['id']:03d}",
            "fileName": row["file_name"],
            "rows": row["rows"],
            "uploadedAt": row["uploaded_at"],
            "status": row["status"],
        }
        for row in rows
    ]


@api_router.post("/demo/reset")
def reset_demo():
    with get_connection() as db:
        db.execute("DELETE FROM logs")
        db.execute("DELETE FROM alerts")
        db.execute("DELETE FROM alert_notes")
        db.execute("DELETE FROM uploads")

    return {"message": "Demo database cleared"}


app.include_router(api_router)
app.include_router(api_router, prefix="/api")
