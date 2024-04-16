
from dataclasses import dataclass
from flask_sqlalchemy import SQLAlchemy
import json

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

def make_error_response(code: int, reason: str):
    return json.dumps({
        "code": code,
        "reason": reason
    }), code

db = SQLAlchemy()
