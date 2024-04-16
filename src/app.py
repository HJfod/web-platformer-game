
from flask import Flask, render_template, jsonify, url_for, request, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from os import getenv, path
from dotenv import load_dotenv
from dataclasses import dataclass
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.exc import IntegrityError
from wonderwords import RandomWord
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
class UpdateLevelMetadata:
    name: str

@dataclass
class Review:
    rating: int
    body: str

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
        reason = f"Database constraint '{e.orig.diag.constraint_name}' violated"

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
        SELECT Levels.id, Levels.name, Levels.published_at, Users.id, Users.username,
            (SELECT COUNT(*) FROM LevelPlays WHERE Levels.id = LevelPlays.level_id),
            (SELECT COUNT(*) FROM LevelClears WHERE Levels.id = LevelClears.level_id),
            (SELECT COUNT(*) FROM Reviews WHERE Levels.id = Reviews.level_id)
        FROM Levels
        LEFT JOIN Users ON Users.id = Levels.publisher
        GROUP BY Levels.id, Levels.name, Levels.published_at, Users.id, Users.username
    """))

    response = list()
    for id, name, published_at, user_id, publisher, plays, clears, reviews in result.fetchall():
        response.append({
            "name": str(name),
            "publisher": str(publisher),
            "published_at": str(published_at),
            "plays": int(plays),
            "clears": int(clears),
            "reviews": int(reviews),
            "play_url": url_for('play_level', id=id),
        })
    return json.dumps(response)

@app.route("/api/levels/my")
def get_users_levels():
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to get your levels')

    result = db.session.execute(text("""
        SELECT Levels.id, Levels.name, Users.username,
            (SELECT COUNT(*) FROM LevelPlays WHERE Levels.id = LevelPlays.level_id),
            (SELECT COUNT(*) FROM LevelClears WHERE Levels.id = LevelClears.level_id),
            (SELECT COUNT(*) FROM Reviews WHERE Levels.id = Reviews.level_id)
        FROM Levels
        LEFT JOIN Users ON Users.id = Levels.publisher
        WHERE Users.id = :user_id
        GROUP BY Levels.id, Levels.name, Users.id, Users.username
    """), {
        "user_id": session["user_id"],
    })

    response = list()
    for id, name, publisher, plays, clears, reviews in result.fetchall():
        response.append({
            "name": str(name),
            "publisher": str(publisher),
            "plays": int(plays),
            "clears": int(clears),
            "reviews": int(reviews),
            "play_url": url_for('play_level', id=id),
        })
    return json.dumps(response)

@app.route("/api/levels/<int:id>/data")
def get_level_data(id: int):
    result = db.session.execute(text("""
        SELECT data
        FROM Levels
        WHERE id = :id
    """), {
        "id": id,
    })
    return result.fetchone()[0]

@app.route("/api/levels/wip")
def get_users_wip_levels():
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    result = db.session.execute(text("""
        SELECT UnpublishedLevels.id, UnpublishedLevels.name
        FROM Users
        LEFT JOIN UnpublishedLevels ON Users.id = UnpublishedLevels.creator
        WHERE Users.id = :user_id
        GROUP BY UnpublishedLevels.id, UnpublishedLevels.name
    """), {
        "user_id": session["user_id"]
    })

    response = list()
    for id, name in result.fetchall():
        print(f"{id}, {name}")
        if id != None and name != None:
            response.append({
                "name": str(name),
                "url": url_for('edit_level', id=int(id)),
            })
    return json.dumps(response)

@app.route("/api/levels/<int:id>/mark-as-played", methods=["POST"])
def mark_level_as_played(id: int):
    db.session.execute(text("""
        INSERT INTO LevelPlays (level_id, user_id)
        VALUES (:level_id, :user_id)
    """), {
        "level_id": id,
        "user_id": session["user_id"]
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/<int:id>/mark-as-cleared", methods=["POST"])
def mark_level_as_cleared(id: int):
    db.session.execute(text("""
        INSERT INTO LevelClears (level_id, user_id)
        VALUES (:level_id, :user_id)
    """), {
        "level_id": id,
        "user_id": session["user_id"]
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/<int:id>/reviews")
def get_all_level_reviews(id: int):
    result = db.session.execute(text("""
        SELECT Users.id, Users.username, Reviews.rating, Reviews.body, Reviews.posted_at
        FROM Reviews
        LEFT JOIN Users ON Users.id = Reviews.user_id
        LEFT JOIN Levels ON Levels.id = Reviews.level_id
        WHERE Levels.id = :level_id
        GROUP BY Users.id, Users.username, Reviews.rating, Reviews.body, Reviews.posted_at
    """), {
        "level_id": id,
    })

    response = list()
    for user_id, username, rating, body, posted_at in result.fetchall():
        response.append({
            "user_id": int(user_id),
            "username": str(username),
            "rating": int(rating),
            "body": str(body),
            "posted_at": str(posted_at),
        })
    return json.dumps(response)

@app.route("/api/levels/<int:id>/reviews", methods=["DELETE"])
def delete_level_reviews(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    db.session.execute(text("""
        DELETE FROM Reviews
        WHERE user_id = :user_id AND level_id = :level_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/<int:id>/reviews", methods=["POST"])
def post_level_review(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    params = Review(**request.json)

    db.session.execute(text("""
        INSERT INTO Reviews (level_id, user_id, rating, body)
        VALUES (:level_id, :user_id, :rating, :body)
    """), {
        "level_id": id,
        "user_id": session["user_id"],
        "rating": params.rating,
        "body": params.body
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip", methods=["POST"])
def create_new_level():
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    s = RandomWord()

    name = ' '.join(s.random_words(4, word_max_length=6))
    while db.session.execute(
        text("SELECT name FROM UnpublishedLevels WHERE creator = :user_id AND name = :name"),
        { "user_id": session["user_id"], "name": name }
    ).fetchone() != None:
        name = ' '.join(s.random_words(4, word_max_length=6))

    id = db.session.execute(text("""
        INSERT INTO UnpublishedLevels (creator, name, data)
        VALUES (:creator, :name, :data)
        RETURNING id
    """), {
        "name": name,
        "creator": session["user_id"],
        "data": json.dumps({})
    }).fetchone()[0]
    db.session.commit()

    return { "url": url_for('edit_level', id=id) }, 200

@app.route("/api/levels/wip/<int:id>/update-data", methods=["POST"])
def get_users_wip_level_update_data(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    data = request.json

    db.session.execute(text("""
        UPDATE UnpublishedLevels
        SET data = :data
        WHERE creator = :user_id AND id = :level_id
    """), {
        "data": json.dumps(data),
        "user_id": session["user_id"],
        "level_id": id,
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip/<int:id>/update-metadata", methods=["POST"])
def get_users_wip_level_update(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    # todo: verify the level hasn't been published yet

    params = UpdateLevelMetadata(**request.json)

    db.session.execute(text("""
        UPDATE UnpublishedLevels
        SET name = :name
        WHERE UnpublishedLevels.creator = :user_id AND UnpublishedLevels.id = :level_id
    """), {
        "name": params.name,
        "user_id": session["user_id"],
        "level_id": id,
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip/<int:id>/data")
def get_users_wip_level_data(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    result = db.session.execute(text("""
        SELECT UnpublishedLevels.data
        FROM Users
        LEFT JOIN UnpublishedLevels ON Users.id = UnpublishedLevels.creator
        WHERE Users.id = :user_id AND UnpublishedLevels.id = :level_id
        GROUP BY UnpublishedLevels.id, UnpublishedLevels.name
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    })
    return result.fetchone()[0]

@app.route("/api/levels/wip/<int:id>/publish", methods=["POST"])
def publish_level(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    name, data = db.session.execute(text("""
        SELECT UnpublishedLevels.name, UnpublishedLevels.data
        FROM Users
        LEFT JOIN UnpublishedLevels ON Users.id = UnpublishedLevels.creator
        WHERE Users.id = :user_id AND UnpublishedLevels.id = :level_id
        GROUP BY UnpublishedLevels.id, UnpublishedLevels.name
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    }).fetchone()

    published_id = db.session.execute(text("""
        INSERT INTO Levels (name, publisher, data)
        VALUES (:name, :publisher, :data)
        RETURNING id
    """), {
        "name": name,
        "publisher": session["user_id"],
        "data": json.dumps(data)
    }).fetchone()[0]

    db.session.execute(text("""
        UPDATE UnpublishedLevels
        SET published_id = :published_id
        WHERE UnpublishedLevels.creator = :user_id AND UnpublishedLevels.id = :level_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
        "published_id": published_id,
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip/<int:id>/update", methods=["POST"])
def update_level(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    published_id, name, data = db.session.execute(text("""
        SELECT UnpublishedLevels.published_id, UnpublishedLevels.name, json_agg(UnpublishedLevels.data)
        FROM Users
        LEFT JOIN UnpublishedLevels ON Users.id = UnpublishedLevels.creator
        WHERE Users.id = :user_id AND UnpublishedLevels.id = :level_id
        GROUP BY UnpublishedLevels.published_id, UnpublishedLevels.name
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    }).fetchone()

    db.session.execute(text("""
        UPDATE Levels
        SET name = :name, data = :data
        WHERE Levels.publisher = :user_id AND Levels.id = :level_id
    """), {
        "user_id": session["user_id"],
        "level_id": published_id,
        "name": name,
        "data": json.dumps(data[0]),
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip/<int:id>/delete", methods=["POST"])
def delete_wip_level(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    db.session.execute(text("""
        DELETE FROM UnpublishedLevels
        WHERE creator = :user_id AND id = :level_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    })
    db.session.commit()

    return {}, 200

@app.route("/api/levels/wip/<int:id>/unpublish", methods=["POST"])
def unpublish_level(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')

    db.session.execute(text("""
        DELETE FROM Levels
        USING Users, UnpublishedLevels
        WHERE Users.id = :user_id AND
            UnpublishedLevels.id = :level_id AND
            Levels.id = UnpublishedLevels.published_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
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
    }).fetchone()
    if result == None:
        return make_error_response(403, "No such user")
    
    pw_hash, user_id = result
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

@app.route("/star-svg")
def asset_star_svg():
    return render_template("star.svg.j2")

@app.route("/")
def index():
    return render_template("pages/home.html.j2")

@app.route("/user")
def userpage():
    return render_template("pages/userpage.html.j2")

@app.route("/edit/<int:id>")
def edit_level(id: int):
    if not "user_id" in session:
        return make_error_response(403, 'You need to log in to create levels')
    
    name, published_id = db.session.execute(text("""
        SELECT UnpublishedLevels.name, UnpublishedLevels.published_id
        FROM Users
        LEFT JOIN UnpublishedLevels ON Users.id = UnpublishedLevels.creator
        WHERE Users.id = :user_id AND UnpublishedLevels.id = :level_id
        GROUP BY UnpublishedLevels.name, UnpublishedLevels.published_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    }).fetchone()
    
    return render_template("pages/editor.html.j2", level_id=id, level_name=name, published_id=published_id)

@app.route("/level/<int:id>")
def play_level(id: int):
    return render_template("pages/level.html.j2", level_id=id)
