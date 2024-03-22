
from flask import Flask, render_template, url_for
import mimetypes

mimetypes.add_type('text/javascript', '.mjs')

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("pages/home.html.j2")

@app.route("/level/<string:id>")
def play_level(id: str):
    return render_template("pages/level.html.j2", level_id=id)
