from contextlib import contextmanager
from functools import wraps
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
from datetime import date

import pandas as pd
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parents[2]
DATASET_PATH = BASE_DIR / "pharma_dataset.csv"
DATABASE_PATH = Path(os.environ.get("PHARMA_DATABASE_PATH", BASE_DIR / "pharma_app.db"))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_COOKIE_SECURE", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=60 * 60 * 12,
)
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173", "http://127.0.0.1:5173"],
)

try:
    df = pd.read_csv(DATASET_PATH)
except FileNotFoundError as exc:
    raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}") from exc


@contextmanager
def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with get_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                batch_number TEXT NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                expiry_date TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                age INTEGER,
                contact TEXT NOT NULL DEFAULT '',
                condition TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


initialize_database()


def error_response(message, status):
    return jsonify({"error": message}), status


def authenticated_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return error_response("Authentication required.", 401)
        return view(*args, **kwargs)

    return wrapped


def csrf_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return view(*args, **kwargs)
        token = session.get("csrf_token")
        if not token or request.headers.get("X-CSRF-Token") != token:
            return error_response("Invalid security token. Refresh and try again.", 403)
        return view(*args, **kwargs)

    return wrapped


def create_authenticated_session(user):
    session.clear()
    session.permanent = True
    session["user_id"] = user["id"]
    session["email"] = user["email"]
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify(
        {
            "authenticated": True,
            "email": user["email"],
            "csrfToken": session["csrf_token"],
        }
    )


@app.route("/api/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error_response("Enter a valid email address.", 400)
    if len(password) < 8:
        return error_response("Password must be at least 8 characters.", 400)

    try:
        with get_db() as connection:
            cursor = connection.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email, generate_password_hash(password)),
            )
            user = {"id": cursor.lastrowid, "email": email}
    except sqlite3.IntegrityError:
        return error_response("An account with this email already exists.", 409)

    return create_authenticated_session(user), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    with get_db() as connection:
        user = connection.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return error_response("Email or password is incorrect.", 401)
    return create_authenticated_session(user)


@app.route("/api/auth/me", methods=["GET"])
def current_user():
    if "user_id" not in session:
        return error_response("Authentication required.", 401)
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify(
        {
            "authenticated": True,
            "email": session["email"],
            "csrfToken": session["csrf_token"],
        }
    )


@app.route("/api/auth/logout", methods=["POST"])
@authenticated_required
@csrf_required
def logout():
    session.clear()
    return jsonify({"authenticated": False})


@app.route("/api/drugs", methods=["GET"])
@authenticated_required
def get_drugs():
    records = json.loads(df.to_json(orient="records"))
    return jsonify(records)


@app.route("/api/medicines", methods=["GET", "POST"])
@authenticated_required
@csrf_required
def medicines():
    if request.method == "GET":
        with get_db() as connection:
            rows = connection.execute(
                """SELECT id, name, batch_number, quantity, expiry_date, category
                   FROM medicines WHERE user_id = ? ORDER BY expiry_date""",
                (session["user_id"],),
            ).fetchall()
        return jsonify([dict(row) for row in rows])

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    batch_number = str(payload.get("batch_number", "")).strip()
    category = str(payload.get("category", "")).strip()
    try:
        quantity = int(payload.get("quantity", 0))
        expiry_date = date.fromisoformat(str(payload.get("expiry_date", ""))).isoformat()
    except (TypeError, ValueError):
        return error_response("Enter a valid quantity and expiry date.", 400)
    if not name or not batch_number:
        return error_response("Medicine name and batch number are required.", 400)
    if quantity < 1:
        return error_response("Quantity must be greater than zero.", 400)

    with get_db() as connection:
        cursor = connection.execute(
            """INSERT INTO medicines
               (user_id, name, batch_number, quantity, expiry_date, category)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session["user_id"], name, batch_number, quantity, expiry_date, category),
        )
    return jsonify(
        {
            "id": cursor.lastrowid,
            "name": name,
            "batch_number": batch_number,
            "quantity": quantity,
            "expiry_date": expiry_date,
            "category": category,
        }
    ), 201


@app.route("/api/patients", methods=["GET", "POST"])
@authenticated_required
@csrf_required
def patients():
    if request.method == "GET":
        with get_db() as connection:
            rows = connection.execute(
                """SELECT id, name, age, contact, condition
                   FROM patients WHERE user_id = ? ORDER BY id DESC""",
                (session["user_id"],),
            ).fetchall()
        return jsonify([dict(row) for row in rows])

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    contact = str(payload.get("contact", "")).strip()
    condition = str(payload.get("condition", "")).strip()
    raw_age = payload.get("age")
    try:
        age = int(raw_age) if raw_age not in (None, "") else None
    except (TypeError, ValueError):
        return error_response("Age must be a whole number.", 400)
    if not name:
        return error_response("Patient name is required.", 400)
    if age is not None and not 0 <= age <= 120:
        return error_response("Age must be between 0 and 120.", 400)

    with get_db() as connection:
        cursor = connection.execute(
            """INSERT INTO patients (user_id, name, age, contact, condition)
               VALUES (?, ?, ?, ?, ?)""",
            (session["user_id"], name, age, contact, condition),
        )
    return jsonify(
        {
            "id": cursor.lastrowid,
            "name": name,
            "age": age,
            "contact": contact,
            "condition": condition,
        }
    ), 201


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=os.environ.get("FLASK_DEBUG", "").lower() == "true",
    )
