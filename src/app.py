
from flask import Flask, render_template, session
from sqlalchemy import text
from os import getenv, path
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError
from models import check_logged_in, check_logged_in_mut, make_error_response, db
from api.auth import auth_api
from api.user import user_api
from api.editor import editor_api
from api.levels import levels_api
from api.reviews import reviews_api
import json
import mimetypes

# Load environment variables if provided
load_dotenv()

# Recognize .mjs file extension as JavaScript
mimetypes.add_type("text/javascript", ".mjs")

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DATABASE_URL")
app.secret_key = getenv("SECRET_KEY")
app.template_folder = '../templates'
db.init_app(app)
app.register_blueprint(auth_api)
app.register_blueprint(user_api)
app.register_blueprint(levels_api)
app.register_blueprint(reviews_api)
app.register_blueprint(editor_api)

### Error handler ###

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
    if not check_logged_in():
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
    result = db.session.execute(text("""
        SELECT Levels.id, Levels.name, Levels.published_at, Users.id, Users.username,
            (SELECT COUNT(*) FROM LevelPlays WHERE Levels.id = LevelPlays.level_id),
            (SELECT COUNT(*) FROM LevelClears WHERE Levels.id = LevelClears.level_id),
            (SELECT COUNT(*) FROM Reviews WHERE Levels.id = Reviews.level_id)
        FROM Levels
        LEFT JOIN Users ON Users.id = Levels.publisher
        WHERE Levels.id = :level_id
        GROUP BY Levels.id, Levels.name, Levels.published_at, Users.id, Users.username
    """), {
        "level_id": id,
    })
    level_id, name, published_at, user_id, publisher, plays, clears, reviews = result.fetchall()[0]

    user_has_review = False
    if check_logged_in():
        user_has_review = db.session.execute(text("""
            SELECT COUNT(*)
            FROM Reviews
            WHERE Reviews.user_id = :user_id AND Reviews.level_id = :level_id
        """), {
            "level_id": id,
            "user_id": session["user_id"],
        }).fetchone()[0]
    
    return render_template(
        "pages/level.html.j2",
        level_id=id,
        level_name=name,
        level_creator=publisher,
        level_published_at=published_at,
        level_has_been_reviewed_by_current_user=user_has_review,
    )
