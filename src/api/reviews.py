
from flask import Blueprint, request, session
from sqlalchemy import text
from models import check_logged_in, check_logged_in_mut, make_error_response, Review
from models import db
import json

reviews_api = Blueprint('reviews_api', __name__, template_folder='../templates')

@reviews_api.route("/api/levels/<int:id>/reviews")
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

@reviews_api.route("/api/levels/<int:id>/reviews", methods=["DELETE"])
def delete_level_reviews(id: int):
    if not check_logged_in_mut():
        return make_error_response(403, 'You need to log in to post reviews')

    db.session.execute(text("""
        DELETE FROM Reviews
        WHERE user_id = :user_id AND level_id = :level_id
    """), {
        "user_id": session["user_id"],
        "level_id": id,
    })
    db.session.commit()

    return {}, 200

@reviews_api.route("/api/levels/<int:id>/reviews", methods=["POST"])
def post_level_review(id: int):
    if not check_logged_in_mut():
        return make_error_response(403, 'You need to log in to post reviews')

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
