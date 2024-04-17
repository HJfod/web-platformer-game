
from flask import Blueprint, request, session
from sqlalchemy import text
from models import Icon
from models import db

user_api = Blueprint('user_api', __name__, template_folder='../templates')

@user_api.route("/api/user/icon", methods=["POST"])
def set_user_icon():
    params = Icon(**request.json)
    session['user_icon'] = params.icon

    # If there is a logged in user, update their choice of icon
    if 'user_id' in session:
        db.session.execute(text("""
            UPDATE Users
            SET icon = :icon
            WHERE id = :user_id
        """), {
            "user_id": session["user_id"],
            "icon": params.icon,
        })
        db.session.commit()

    return {}, 200

@user_api.route("/api/user/icon")
def get_user_icon():
    if 'user_icon' in session:
        return session['user_icon'], 200
    return 'gradient', 200
