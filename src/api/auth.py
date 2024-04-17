
from flask import Blueprint, request, session
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash
from models import make_error_response, Login
from models import db

auth_api = Blueprint('auth_api', __name__, template_folder='../templates')

@auth_api.route("/api/auth/create-account", methods=["POST"])
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
    session['user_icon'] = 'gradient'

    return {}, 200

@auth_api.route("/api/auth/login", methods=["POST"])
def api_auth_login_user():
    params = Login(**request.json)

    result = db.session.execute(text("""
        SELECT password, id, icon
        FROM Users
        WHERE username = :username
    """), {
        "username": params.username
    }).fetchone()
    if result == None:
        return make_error_response(403, "No such user")
    
    pw_hash, user_id, icon = result
    if not check_password_hash(pw_hash, params.password):
        return make_error_response(403, "Wrong password")

    session['user_id'] = user_id
    session['username'] = params.username
    session['user_icon'] = icon

    return {}, 200

@auth_api.route("/api/auth/logout", methods=["POST"])
def api_auth_logout_user():
    if 'user_id' in session:
        del session['user_id']
        del session['username']
        del session['user_icon']
    return {}, 200
