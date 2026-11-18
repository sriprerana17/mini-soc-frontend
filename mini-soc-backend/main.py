import csv
import io
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
          AND LOWER(event_type) IN ('failed_login', 'login_failed')
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

    # Deduplication: check if an open alert already exists for this IP and rule
    existing = db.execute(
        """
        SELECT id FROM alerts
        WHERE source_ip = ?
          AND (detection_rule = ? OR detection_rule = ?)
          AND status = 'open'
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

    if len(content) > 2_000_000:
        raise HTTPException(
            status_code=413,
            detail="File must be smaller than 2 MB.",
        )

    try:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))

        headers = {
            header.strip()
            for header in (reader.fieldnames or [])
            if header
        }

        if not {"source_ip", "event_type"}.issubset(headers):
            raise HTTPException(
                status_code=400,
                detail="CSV needs source_ip and event_type columns.",
            )

        failed_by_ip = {}
        valid_logs = []

        for row in reader:
            event = {
                key.strip(): (value or "").strip()
                for key, value in row.items()
                if key is not None
            }

            source_ip = event.get("source_ip", "")
            event_type = event.get("event_type", "").lower()

            if not source_ip or not event_type:
                continue

            valid_logs.append({
                "source_ip": source_ip,
                "event_type": event_type,
                "event_time": event.get("timestamp", ""),
                "details": event.get("details", ""),
            })

            if event_type in {"failed_login", "login_failed"}:
                failed_by_ip[source_ip] = (
                    failed_by_ip.get(source_ip, 0) + 1
                )

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV must use UTF-8 text encoding.",
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
                "Processed" if valid_logs else "Rejected",
            ),
        )

    return {
        "message": "CSV processed successfully",
        "uploaded_logs": len(valid_logs),
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
