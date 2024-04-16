# :cyclone: Platformer Game

:point_right: A simple web platformer game for an university course, inspired by games like [Geometry Dash](https://www.robtopgames.com/) and [The Impossible Game](https://impossible.game/). 

<p>
    <img src="/assets/preview-2-menu.png" width="300" alt="Image of the game's main menu, showing a list of levels to play"></img>
    <img src="/assets/preview-2-play.png" width="230" alt="Image of the game's gameplay, showing the player cube standing on blocks"></img>
    <img src="/assets/preview-2-editor.png" width="230" alt="Image of the game's editor, showing early controls to create & modify levels"></img>
</p>

> Screenshots of an early version of the game, showing the main menu, gameplay, and the level editor

Anyone can play maps without needing to log in. Users with an account can also create and publish their own maps, as well as rate the difficulty and review other people's maps.

 * :chart_with_upwards_trend: Terrible physics engine
 * :fire: No original concepts
 * :rocket: Blazingly slow
 * :tada: Essentially zero fun gameplay features
 * :hourglass: Will be shut down fifty seconds after the course is complete

## :watch: Status

 * [x] Account system
 * [x] Game engine
 * [x] Basic level editor
 * [x] Uploading & un-uploading levels
 * [ ] Level reviews
 * [ ] Player sprite & color customizability options
 * [ ] Polish in-game graphics
 * [ ] Polish level editor UI/UX
 * [ ] Finish gameplay features such as moving objects
 * [ ] Mobile support

## :zap: Running a local copy

> :running_woman: **Quick Instructions**: Use `pip install -r requirements.txt` to setup, then `python -m flask --app src/app.py run` to run the app in development mode.

These are the instructions for running a **local server** of the game. This means that the game connects to a **local database**, so all maps and reviews are stored only on your local computer.

1. Install [Python](https://www.python.org/downloads/).

2. Clone the repository via Git.

3. Install the required Python modules by running `pip install -r requirements.txt` in the project directory.

4. Make sure your Postgres service is running. Initialize the Postgres database by running `postgres -U <your_user_name> -f sql/reset.sql`.

5. You can then run a local server by running `python -m flask --app src/app.py run --debug`. This starts a new web server at [http://127.0.0.1:5000] by default.
