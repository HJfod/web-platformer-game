
DROP TABLE IF EXISTS Users, Levels, LevelData, LevelPlays, Reviews;

CREATE TABLE Users (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    CONSTRAINT username_unique UNIQUE (username),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20)
);

CREATE TABLE Levels (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 25),
    publisher INT REFERENCES Users NOT NULL,
    published_at TIMESTAMP DEFAULT current_timestamp,
    data JSON NOT NULL,
    UNIQUE (name, publisher)
);

CREATE TABLE LevelPlays (
    level_id INT REFERENCES Levels NOT NULL,
    user_id INT REFERENCES Users
);

CREATE TABLE Reviews (
    level_id INT REFERENCES Levels NOT NULL,
    user_id INT REFERENCES Users NOT NULL,
    difficulty_rating INT NOT NULL CHECK(0 <= difficulty_rating AND difficulty_rating <= 3),
    body TEXT NOT NULL CHECK (LENGTH(body) <= 200),
    UNIQUE (level_id, user_id)
);
