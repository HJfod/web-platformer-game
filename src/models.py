
from flask import request, session
from dataclasses import dataclass
from flask_sqlalchemy import SQLAlchemy
import json

### Models ###

@dataclass
class CSRFCheck:
    csrf_token: str

@dataclass
class UpdateLevelMetadata(CSRFCheck):
    name: str

@dataclass
class Review(CSRFCheck):
    rating: int
    body: str

@dataclass
class Icon(CSRFCheck):
    icon: str

@dataclass
class Login(CSRFCheck):
    username: str
    password: str

def make_error_response(code: int, reason: str):
    return json.dumps({
        "code": code,
        "reason": reason
    }), code

def check_csrf():
    if check_logged_in():
        return request.json["csrf_token"] == session["csrf_token"]
    
    # If there is no user logged in, well then we're aight
    return True

def check_logged_in():
    return ('user_id' in session)

def check_logged_in_mut():
    return check_csrf() and ('user_id' in session)

db = SQLAlchemy()
