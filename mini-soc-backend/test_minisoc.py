import sys
import unittest
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch
from datetime import datetime
from fastapi import HTTPException

# Ensure backend root is in import path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import main

class ReadyAwaitable:
    def __init__(self, value):
        self.value = value
    def __await__(self):
        if False:
            yield
        return self.value

class FakeUploadFile:
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self._content = content
    def read(self):
        return ReadyAwaitable(self._content)

def run_coroutine(coro):
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value
    raise RuntimeError("Coroutine did not finish immediately")

class TestMiniSOC(unittest.TestCase):
    def setUp(self):
        # Uses a temporary isolated database so minisoc.db is NEVER touched
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.temp_db_path = Path(self.temp_db.name)
        self.temp_db.close()

        self.db_patcher = patch.object(main, "DB_PATH", self.temp_db_path)
        self.db_patcher.start()
        main.initialize_database()

    def tearDown(self):
        self.db_patcher.stop()
        if self.temp_db_path.exists():
            try:
                self.temp_db_path.unlink()
            except Exception:
                pass

    # --- 7 Original Tests Preserved ---

    def test_home(self):
        res = main.home()
        self.assertEqual(res["message"], "MiniSOC backend is running")
        self.assertEqual(res["docs"], "/docs")

    def test_health(self):
        res = main.health()
        self.assertEqual(res["status"], "ok")

    def test_initial_dashboard_and_fetch(self):
        dash = main.dashboard()
        self.assertEqual(dash["total_logs"], 0)
        self.assertEqual(dash["total_alerts"], 0)
        self.assertEqual(dash["high_alerts"], 0)
        self.assertEqual(dash["critical_alerts"], 0)
        self.assertEqual(dash["suspicious_ips"], 0)

        logs = main.get_logs()
        self.assertEqual(logs, {"total": 0, "logs": []})

        alerts = main.get_alerts()
        self.assertEqual(alerts, {"total": 0, "alerts": []})

    def test_csv_upload_non_csv(self):
        fake_file = FakeUploadFile(filename="test.txt", content=b"hello")
        with self.assertRaises(HTTPException) as ctx:
            run_coroutine(main.upload_logs(fake_file))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Please upload a CSV file", ctx.exception.detail)

    def test_csv_upload_missing_columns(self):
        fake_file = FakeUploadFile(
            filename="bad.csv",
            content=b"ip,status\n192.168.1.1,failed\n"
        )
        with self.assertRaises(HTTPException) as ctx:
            run_coroutine(main.upload_logs(fake_file))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("needs source_ip and event_type", ctx.exception.detail)

    def test_csv_upload_success_and_detection(self):
        csv_data = (
            "source_ip,event_type,timestamp,details\n"
            "192.168.1.100,failed_login,2026-11-11 10:00:00,admin failed\n"
            "192.168.1.100,failed_login,2026-11-11 10:00:01,admin failed\n"
            "192.168.1.100,failed_login,2026-11-11 10:00:02,admin failed\n"
            "192.168.1.100,failed_login,2026-11-11 10:00:03,admin failed\n"
            "192.168.1.100,failed_login,2026-11-11 10:00:04,admin failed\n"
            "10.0.0.5,login_success,2026-11-11 10:00:05,user ok\n"
        ).encode("utf-8")

        fake_file = FakeUploadFile(filename="good.csv", content=csv_data)
        result = run_coroutine(main.upload_logs(fake_file))

        self.assertEqual(result["uploaded_logs"], 6)
        self.assertEqual(len(result["new_alerts"]), 1)
        self.assertEqual(result["new_alerts"][0]["source_ip"], "192.168.1.100")
        self.assertEqual(result["new_alerts"][0]["severity"], "high")

        # Check get_logs
        logs = main.get_logs()
        self.assertEqual(logs["total"], 6)

        # Check get_alerts
        alerts = main.get_alerts()
        self.assertEqual(alerts["total"], 1)
        self.assertEqual(alerts["alerts"][0]["source_ip"], "192.168.1.100")

        # Check dashboard
        dash = main.dashboard()
        self.assertEqual(dash["total_logs"], 6)
        self.assertEqual(dash["total_alerts"], 1)
        self.assertEqual(dash["high_alerts"], 1)
        self.assertEqual(dash["critical_alerts"], 0)
        self.assertEqual(dash["suspicious_ips"], 1)

    def test_reset_demo(self):
        csv_data = b"source_ip,event_type\n1.1.1.1,login_success\n"
        fake_file = FakeUploadFile(filename="good.csv", content=csv_data)
        run_coroutine(main.upload_logs(fake_file))
        self.assertEqual(main.get_logs()["total"], 1)

        res = main.reset_demo()
        self.assertEqual(res["message"], "Demo database cleared")
        self.assertEqual(main.get_logs()["total"], 0)
        self.assertEqual(main.get_alerts()["total"], 0)

    # --- Phase 1 & 2 Tests ---

    def test_cors_configuration(self):
        cors_middleware = None
        for middleware in main.app.user_middleware:
            if middleware.cls.__name__ == "CORSMiddleware":
                cors_middleware = middleware
                break

        self.assertIsNotNone(cors_middleware, "CORSMiddleware should be installed on app")
        origins = cors_middleware.kwargs.get("allow_origins", [])
        self.assertIn("http://localhost:5173", origins)
        self.assertIn("http://127.0.0.1:5173", origins)
        self.assertIn("http://localhost:3000", origins)
        methods = cors_middleware.kwargs.get("allow_methods", [])
        self.assertTrue("*" in methods or "GET" in methods)

    def test_medium_severity_alert_with_timestamp(self):
        csv_data = (
            "source_ip,event_type\n"
            "192.168.1.50,failed_login\n"
            "192.168.1.50,failed_login\n"
            "192.168.1.50,failed_login\n"
        ).encode("utf-8")

        fake_file = FakeUploadFile(filename="medium_test.csv", content=csv_data)
        result = run_coroutine(main.upload_logs(fake_file))

        self.assertEqual(len(result["new_alerts"]), 1)
        alert = result["new_alerts"][0]
        self.assertEqual(alert["source_ip"], "192.168.1.50")
        self.assertEqual(alert["severity"], "medium")
        self.assertIn("created_at", alert)
        self.assertTrue(len(alert["created_at"]) > 0)

        # Verify timestamp can be parsed as YYYY-MM-DD HH:MM:SS
        dt = datetime.strptime(alert["created_at"], "%Y-%m-%d %H:%M:%S")
        self.assertIsNotNone(dt)

        all_alerts = main.get_alerts()
        self.assertEqual(all_alerts["alerts"][0]["created_at"], alert["created_at"])

    def test_critical_severity_alert(self):
        lines = ["source_ip,event_type"] + ["10.0.0.99,login_failed"] * 10
        csv_data = "\n".join(lines).encode("utf-8")

        fake_file = FakeUploadFile(filename="critical_test.csv", content=csv_data)
        result = run_coroutine(main.upload_logs(fake_file))

        self.assertEqual(len(result["new_alerts"]), 1)
        alert = result["new_alerts"][0]
        self.assertEqual(alert["source_ip"], "10.0.0.99")
        self.assertEqual(alert["severity"], "critical")

        dash = main.dashboard()
        self.assertEqual(dash["critical_alerts"], 1)

    def test_database_migration_adds_created_at_to_legacy_table(self):
        with sqlite3.connect(self.temp_db_path) as db:
            db.execute("DROP TABLE IF EXISTS alerts")
            db.execute("""
                CREATE TABLE alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_ip TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    detection_rule TEXT NOT NULL
                )
            """)
            db.execute("""
                INSERT INTO alerts (source_ip, severity, description, status, detection_rule)
                VALUES ('1.2.3.4', 'high', 'Legacy Alert', 'open', 'legacy_rule')
            """)

        main.initialize_database()

        with sqlite3.connect(self.temp_db_path) as db:
            columns = [r[1] for r in db.execute("PRAGMA table_info(alerts)").fetchall()]
            self.assertIn("created_at", columns)
            row = db.execute("SELECT * FROM alerts WHERE source_ip = '1.2.3.4'").fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[1], "1.2.3.4")

    # --- Phase 3 Tests: Alert Status Endpoint ---

    def test_update_alert_status_success_and_retrieval(self):
        # 1. Create an alert via CSV upload
        csv_data = (
            "source_ip,event_type\n"
            "192.168.1.77,failed_login\n"
            "192.168.1.77,failed_login\n"
            "192.168.1.77,failed_login\n"
        ).encode("utf-8")
        fake_file = FakeUploadFile(filename="status_test.csv", content=csv_data)
        upload_res = run_coroutine(main.upload_logs(fake_file))
        alert_id = upload_res["new_alerts"][0]["id"]

        # Initial status should be "open"
        initial_alert = main.get_alert(alert_id)
        self.assertEqual(initial_alert["status"], "open")
        self.assertEqual(main.dashboard()["open_alerts"], 1)
        self.assertEqual(main.dashboard()["resolved_alerts"], 0)

        # 2. Update status to "resolved"
        update_res = main.update_alert_status(
            alert_id,
            main.AlertStatusUpdate(status="resolved"),
        )
        self.assertIn("updated", update_res["message"].lower())
        self.assertEqual(update_res["alert"]["status"], "resolved")

        # 3. Retrieve by ID and confirm persistence in SQLite
        fetched_alert = main.get_alert(alert_id)
        self.assertEqual(fetched_alert["status"], "resolved")

        # 4. Check get_alerts() list reflects the update
        all_alerts = main.get_alerts()
        self.assertEqual(all_alerts["alerts"][0]["status"], "resolved")

        # 5. Check dashboard reflects resolved alert
        dash = main.dashboard()
        self.assertEqual(dash["open_alerts"], 0)
        self.assertEqual(dash["resolved_alerts"], 1)

    def test_update_alert_status_not_found(self):
        # Attempt to update nonexistent alert ID
        with self.assertRaises(HTTPException) as ctx:
            main.update_alert_status(9999, main.AlertStatusUpdate(status="resolved"))
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found", ctx.exception.detail.lower())

        # Attempt to get nonexistent alert ID
        with self.assertRaises(HTTPException) as ctx:
            main.get_alert(9999)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_update_alert_status_invalid_status(self):
        # Create an alert
        with sqlite3.connect(self.temp_db_path) as db:
            cursor = db.execute(
                """
                INSERT INTO alerts (source_ip, severity, description, status, detection_rule, created_at)
                VALUES ('10.0.0.1', 'medium', 'Test alert', 'open', 'rule', '2026-11-11 12:00:00')
                """
            )
            alert_id = cursor.lastrowid

        # Pass an unallowed status string
        with self.assertRaises(HTTPException) as ctx:
            main.update_alert_status(
                alert_id,
                main.AlertStatusUpdate(status="completely_invalid_status"),
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Invalid status", ctx.exception.detail)

    def test_update_alert_status_case_insensitive(self):
        # Create an alert
        with sqlite3.connect(self.temp_db_path) as db:
            cursor = db.execute(
                """
                INSERT INTO alerts (source_ip, severity, description, status, detection_rule, created_at)
                VALUES ('10.0.0.2', 'high', 'Test alert', 'open', 'rule', '2026-11-11 12:00:00')
                """
            )
            alert_id = cursor.lastrowid

        # Update with mixed case and whitespace: "  INVESTIGATING  "
        update_res = main.update_alert_status(
            alert_id,
            main.AlertStatusUpdate(status="  INVESTIGATING  "),
        )
        self.assertEqual(update_res["alert"]["status"], "investigating")

        # Verify in DB
        fetched = main.get_alert(alert_id)
        self.assertEqual(fetched["status"], "investigating")

    # --- Phase 4 Tests: Cumulative Detection & Single-Log Ingestion ---

    def test_cumulative_detection_across_multiple_uploads(self):
        """Verify failed login attempts across separate uploads combine toward threshold."""
        # Upload 1: 2 failed logins for 172.16.0.5 (threshold is 3, so 0 alerts)
        batch1 = (
            "source_ip,event_type\n"
            "172.16.0.5,failed_login\n"
            "172.16.0.5,failed_login\n"
        ).encode("utf-8")
        res1 = run_coroutine(main.upload_logs(FakeUploadFile("batch1.csv", batch1)))
        self.assertEqual(res1["uploaded_logs"], 2)
        self.assertEqual(len(res1["new_alerts"]), 0)

        # Upload 2: 2 more failed logins for 172.16.0.5 (cumulative total = 4 -> medium alert)
        batch2 = (
            "source_ip,event_type\n"
            "172.16.0.5,failed_login\n"
            "172.16.0.5,failed_login\n"
        ).encode("utf-8")
        res2 = run_coroutine(main.upload_logs(FakeUploadFile("batch2.csv", batch2)))
        self.assertEqual(res2["uploaded_logs"], 2)
        self.assertEqual(len(res2["new_alerts"]), 1)
        alert = res2["new_alerts"][0]
        self.assertEqual(alert["source_ip"], "172.16.0.5")
        self.assertEqual(alert["severity"], "medium")
        self.assertIn("4 failed login attempts", alert["description"])

    def test_single_log_ingestion_success_and_retrieval(self):
        """Verify POST /logs stores an event and it can be retrieved."""
        payload = main.LogCreate(
            source_ip="10.20.30.40",
            event_type="login_success",
            details="User bob logged in successfully",
        )
        res = main.create_log(payload)
        self.assertEqual(res["message"], "Log stored successfully")
        self.assertEqual(res["log"]["source_ip"], "10.20.30.40")
        self.assertEqual(res["log"]["event_type"], "login_success")
        self.assertTrue(len(res["log"]["event_time"]) > 0)
        self.assertEqual(len(res["new_alerts"]), 0)

        # Confirm persisted in DB
        logs = main.get_logs()
        self.assertEqual(logs["total"], 1)
        self.assertEqual(logs["logs"][0]["source_ip"], "10.20.30.40")

    def test_single_log_ingestion_validation(self):
        """Verify POST /logs validates required fields."""
        # Empty source_ip
        with self.assertRaises(HTTPException) as ctx:
            main.create_log(main.LogCreate(source_ip="", event_type="login_success"))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("source_ip", ctx.exception.detail)

        # Empty event_type
        with self.assertRaises(HTTPException) as ctx:
            main.create_log(main.LogCreate(source_ip="1.1.1.1", event_type="   "))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("event_type", ctx.exception.detail)

    def test_single_log_cumulative_threshold_and_duplicate_prevention(self):
        """Verify incremental single-log ingestion triggers alerts and prevents duplicates."""
        ip = "192.168.10.99"

        # Log 1 & 2: Below threshold
        r1 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r1["new_alerts"]), 0)
        r2 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r2["new_alerts"]), 0)

        # Log 3: Reaches Medium threshold (count = 3)
        r3 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r3["new_alerts"]), 1)
        self.assertEqual(r3["new_alerts"][0]["severity"], "medium")

        # Log 4: Same tier (count = 4) -> No duplicate open alert created
        r4 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r4["new_alerts"]), 0)

        # Log 5: Reaches High threshold (count = 5) -> Escalated to High alert
        r5 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r5["new_alerts"]), 1)
        self.assertEqual(r5["new_alerts"][0]["severity"], "high")

        # Log 6: Same tier (count = 6) -> No duplicate High alert created
        r6 = main.create_log(main.LogCreate(source_ip=ip, event_type="failed_login"))
        self.assertEqual(len(r6["new_alerts"]), 0)

    # --- New Feature Tests: Alert Notes, Daily Analytics, Uploads ---

    def test_alert_notes_creation_and_retrieval(self):
        # Create an alert
        with sqlite3.connect(self.temp_db_path) as db:
            cursor = db.execute(
                """
                INSERT INTO alerts (source_ip, severity, description, status, detection_rule, created_at)
                VALUES ('10.0.0.5', 'high', 'Test alert for notes', 'open', 'rule', '2026-11-12 10:00:00')
                """
            )
            alert_id = cursor.lastrowid

        # Add a note
        note_res = main.add_alert_note(
            alert_id,
            main.AlertNoteCreate(text="Checked firewall logs, blocked IP", author="Analyst Bob")
        )
        self.assertEqual(note_res["alert_id"], alert_id)
        self.assertEqual(note_res["author"], "Analyst Bob")
        self.assertEqual(note_res["text"], "Checked firewall logs, blocked IP")

        # Get alert notes directly
        notes = main.get_alert_notes(alert_id)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["text"], "Checked firewall logs, blocked IP")

        # Get alert and check notes array
        alert = main.get_alert(alert_id)
        self.assertEqual(len(alert["notes"]), 1)
        self.assertEqual(alert["notes"][0]["author"], "Analyst Bob")

        # Get all alerts and verify notes are present
        all_alerts = main.get_alerts()
        self.assertEqual(len(all_alerts["alerts"][0]["notes"]), 1)

    def test_daily_analytics(self):
        analytics = main.get_daily_analytics(days=30)
        self.assertEqual(len(analytics), 30)
        first_day = analytics[0]
        self.assertIn("date", first_day)
        self.assertIn("events", first_day)
        self.assertIn("loginSuccess", first_day)
        self.assertIn("loginFailed", first_day)
        self.assertIn("critical", first_day)
        self.assertIn("high", first_day)
        self.assertIn("medium", first_day)
        self.assertIn("low", first_day)

    def test_upload_history(self):
        csv_data = b"source_ip,event_type\n1.2.3.4,failed_login\n"
        fake_file = FakeUploadFile(filename="test_upload.csv", content=csv_data)
        run_coroutine(main.upload_logs(fake_file))

        uploads = main.get_uploads()
        self.assertGreaterEqual(len(uploads), 1)
        self.assertEqual(uploads[0]["fileName"], "test_upload.csv")
        self.assertEqual(uploads[0]["rows"], 1)
        self.assertEqual(uploads[0]["status"], "Processed")

    # --- Authentication & Registration Tests ---

    def test_user_registration_success_and_password_hashing(self):
        reg = main.register(main.UserRegister(
            name="Jane Doe",
            email="JANE.DOE@example.com",
            password="StrongPassword123"
        ))
        self.assertEqual(reg["message"], "User registered successfully")
        self.assertEqual(reg["user"]["name"], "Jane Doe")
        self.assertEqual(reg["user"]["email"], "jane.doe@example.com")
        self.assertEqual(reg["user"]["role"], "SOC Analyst")
        self.assertTrue(len(reg["token"]) > 20)
        self.assertNotIn("password", reg["user"])
        self.assertNotIn("hashed_password", reg["user"])

        # Check DB to verify password hashing
        with sqlite3.connect(self.temp_db_path) as db:
            row = db.execute("SELECT * FROM users WHERE email = 'jane.doe@example.com'").fetchone()
            self.assertIsNotNone(row)
            hashed = row[3]  # hashed_password column
            self.assertNotEqual(hashed, "StrongPassword123")
            self.assertTrue(hashed.startswith("$2b$") or hashed.startswith("$2a$"))
            self.assertTrue(main.verify_password("StrongPassword123", hashed))
            self.assertFalse(main.verify_password("WrongPassword", hashed))

    def test_registration_duplicate_email(self):
        main.register(main.UserRegister(
            name="Alice",
            email="alice@college.edu",
            password="Password123"
        ))
        # Attempt duplicate with different casing
        with self.assertRaises(HTTPException) as ctx:
            main.register(main.UserRegister(
                name="Alice Duplicate",
                email="ALICE@college.edu",
                password="AnotherPassword123"
            ))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already exists", ctx.exception.detail.lower())

    def test_registration_validation(self):
        # Empty name
        with self.assertRaises(HTTPException) as ctx:
            main.register(main.UserRegister(name=" ", email="test@college.edu", password="Password123"))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("name", ctx.exception.detail.lower())

        # Invalid email
        with self.assertRaises(HTTPException) as ctx:
            main.register(main.UserRegister(name="Bob", email="invalid-email", password="Password123"))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("email", ctx.exception.detail.lower())

        # Short password
        with self.assertRaises(HTTPException) as ctx:
            main.register(main.UserRegister(name="Bob", email="bob@college.edu", password="123"))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("at least 6 characters", ctx.exception.detail.lower())

    def test_user_login_success_and_invalid_credentials(self):
        main.register(main.UserRegister(
            name="Charlie",
            email="charlie@soc.org",
            password="MySecretPassword"
        ))

        # Successful login
        login_res = main.login(main.UserLogin(
            email="CHARLIE@soc.org",
            password="MySecretPassword"
        ))
        self.assertEqual(login_res["message"], "Login successful")
        self.assertEqual(login_res["user"]["email"], "charlie@soc.org")
        self.assertTrue(len(login_res["token"]) > 20)

        # Incorrect password
        with self.assertRaises(HTTPException) as ctx:
            main.login(main.UserLogin(
                email="charlie@soc.org",
                password="WrongPassword"
            ))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid email or password.")

        # Nonexistent user
        with self.assertRaises(HTTPException) as ctx:
            main.login(main.UserLogin(
                email="ghost@soc.org",
                password="AnyPassword"
            ))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid email or password.")

    def test_protected_endpoint_auth_me(self):
        reg = main.register(main.UserRegister(
            name="Dave Analyst",
            email="dave@soc.org",
            password="DavePassword123"
        ))
        token = reg["token"]

        # Valid token
        user_info = main.get_current_user(f"Bearer {token}")
        self.assertEqual(user_info["name"], "Dave Analyst")
        self.assertEqual(user_info["email"], "dave@soc.org")
        self.assertEqual(user_info["role"], "SOC Analyst")

        # Missing token
        with self.assertRaises(HTTPException) as ctx:
            main.get_current_user(None)
        self.assertEqual(ctx.exception.status_code, 401)

        # Malformed / invalid token
        with self.assertRaises(HTTPException) as ctx:
            main.get_current_user("Bearer invalid.token.string")
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
