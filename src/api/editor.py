
from flask import Blueprint, url_for, request, session
from sqlalchemy import text
from wonderwords import RandomWord
from models import make_error_response, UpdateLevelMetadata
from models import db
import json

editor_api = Blueprint('editor_api', __name__, template_folder='../templates')

@editor_api.route("/api/levels/wip", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/update-data", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/update-metadata", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/data")
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

@editor_api.route("/api/levels/wip/<int:id>/publish", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/update", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/delete", methods=["POST"])
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

@editor_api.route("/api/levels/wip/<int:id>/unpublish", methods=["POST"])
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
