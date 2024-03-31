
from flask import Flask, render_template, jsonify, make_response, request, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from os import getenv, path
from dotenv import load_dotenv
from dataclasses import dataclass
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.exc import IntegrityError
import json
import mimetypes

# Load environment variables if provided
load_dotenv()

# Recognize .mjs file extension as JavaScript
mimetypes.add_type("text/javascript", ".mjs")

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL")
app.secret_key = getenv("SECRET_KEY")
db = SQLAlchemy(app)

dir = path.dirname(path.realpath(__file__))

### Models ###

@dataclass
class PublishLevel:
    name: str
    publisher: int
    data: dict

@dataclass
class Login:
    username: str
    password: str

### Error handler ###

def make_error_response(code: int, reason: str):
    return json.dumps({
        "code": code,
        "reason": reason
    }), code

@app.errorhandler(Exception)
def handle_error(e: Exception):
    print(e)
    return make_error_response(500, "Internal server error")

@app.errorhandler(IntegrityError)
def handle_error(e: IntegrityError):
    human_readable_reasons = {
        "username_unique": "Username is taken",
        "username_length": "Usernames must be between 3 and 20 characters",
    }

    try:
        reason = human_readable_reasons[e.orig.diag.constraint_name]
    except:
        reason = e._message()

    return make_error_response(400, reason)

@app.errorhandler(HTTPException)
def handle_error(e: HTTPException):
    response = e.get_response()
    response.data = json.dumps({
        "code": e.code,
        "reason": e.description
    })
    response.content_type = "application/json"
    return response

### API ###

@app.route("/api/levels")
def get_all_levels():
    result = db.session.execute(text("""
        SELECT Levels.name, Levels.publisher, COUNT(LevelPlays.user_id)
        FROM Levels
        LEFT JOIN LevelPlays ON Levels.id = LevelPlays.level_id
        GROUP BY Levels.name, Levels.publisher
    """))
    return result.fetchall()

@app.route("/api/levels/<string:id>/data")
def get_level_data(id: str):
    result = db.session.execute(text("""
        SELECT data
        FROM Levels
        WHERE id = :id
    """), {
        "id": id,
    })
    return result.fetchone()[0]

@app.route("/api/levels", methods=["POST"])
def publish_level():
    # The day I use HTML forms is the day I shall be laid down to my final resting place

    params = PublishLevel(**request.json)

    db.session.execute(text("""
        INSERT INTO Levels (name, publisher, data)
        VALUES (:name, :publisher, :data)
        RETURNING id
    """), {
        "name": params.name,
        "publisher": params.publisher,
        "data": json.dumps(params.data)
    })
    db.session.commit()

    return {}, 200

### Auth API ###

@app.route("/api/auth/create-account", methods=["POST"])
def api_auth_create_account():
    params = Login(**request.json)

    user_id = db.session.execute(text("""
        INSERT INTO Users (username, password)
        VALUES (:username, :password)
        RETURNING id
    """), {
        "username": params.username,
        "password": generate_password_hash(params.password),
    }).fetchone()[0]
    db.session.commit()

    session['user_id'] = user_id
    session['username'] = params.username

    return {}, 200

@app.route("/api/auth/login", methods=["POST"])
def api_auth_login_user():
    params = Login(**request.json)

    result = db.session.execute(text("""
        SELECT password, id
        FROM Users
        WHERE username = :username
    """), {
        "username": params.username
    })
    pw_hash, user_id = result.fetchone()
    if not check_password_hash(pw_hash, params.password):
        return make_error_response(403, "Wrong password")

    session['user_id'] = user_id
    session['username'] = params.username

    return {}, 200

@app.route("/api/auth/logout", methods=["POST"])
def api_auth_logout_user():
    del session['user_id']
    del session['username']
    return {}, 200

### Pages ###

@app.route("/")
def index():
    return render_template("pages/home.html.j2")

@app.route("/level/<string:id>")
def play_level(id: str):
    return render_template("pages/level.html.j2", level_id=id)
