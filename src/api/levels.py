
from flask import Blueprint, url_for, session
from sqlalchemy import text
from models import check_logged_in, make_error_response
from models import db
import json

levels_api = Blueprint('levels_api', __name__, template_folder='../templates')

@levels_api.route("/api/levels")
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

@levels_api.route("/api/levels/my")
def get_users_levels():
    if not check_logged_in():
        return make_error_response(403, 'You need to log in to get your levels')

    result = db.session.execute(text("""
        SELECT Levels.id, Levels.name, Levels.published_at, Users.username, 
            (SELECT COUNT(*) FROM LevelPlays WHERE Levels.id = LevelPlays.level_id),
            (SELECT COUNT(*) FROM LevelClears WHERE Levels.id = LevelClears.level_id),
            (SELECT COUNT(*) FROM Reviews WHERE Levels.id = Reviews.level_id)
        FROM Levels
        LEFT JOIN Users ON Users.id = Levels.publisher
        WHERE Users.id = :user_id
        GROUP BY Levels.id, Levels.name, Levels.published_at, Users.id, Users.username
    """), {
        "user_id": session["user_id"],
    })

    response = list()
    for id, name, published_at, publisher, plays, clears, reviews in result.fetchall():
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

@levels_api.route("/api/levels/<int:id>/data")
def get_level_data(id: int):
    result = db.session.execute(text("""
        SELECT data
        FROM Levels
        WHERE id = :id
    """), {
        "id": id,
    })
    return result.fetchone()[0]

@levels_api.route("/api/levels/wip")
def get_users_wip_levels():
    if not check_logged_in():
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

@levels_api.route("/api/levels/<int:id>/mark-as-played", methods=["POST"])
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

@levels_api.route("/api/levels/<int:id>/mark-as-cleared", methods=["POST"])
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
