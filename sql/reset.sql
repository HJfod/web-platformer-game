
DROP TABLE IF EXISTS Users, UnpublishedLevels, Levels, LevelPlays, LevelClears, Reviews;

CREATE TABLE Users (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    icon TEXT NULL,
    CONSTRAINT username_unique UNIQUE (username),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20)
);

CREATE TABLE Levels (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 30),
    publisher INT REFERENCES Users NOT NULL,
    published_at TIMESTAMP DEFAULT current_timestamp,
    data JSON NOT NULL,
    CONSTRAINT creator_may_only_have_one_published_level_of_same_name UNIQUE (name, publisher)
);

CREATE TABLE UnpublishedLevels (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    creator INT REFERENCES Users,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 30),
    data JSON NOT NULL,
    published_id INT REFERENCES Levels ON DELETE SET NULL,
    CONSTRAINT creator_may_only_have_one_created_level_of_same_name UNIQUE (name, creator)
);

CREATE TABLE LevelPlays (
    level_id INT REFERENCES Levels NOT NULL,
    user_id INT REFERENCES Users NULL
);

CREATE TABLE LevelClears (
    level_id INT REFERENCES Levels NOT NULL,
    user_id INT REFERENCES Users NULL
);

CREATE TABLE Reviews (
    level_id INT REFERENCES Levels NOT NULL,
    user_id INT REFERENCES Users NOT NULL,
    rating INT NOT NULL CHECK(0 <= rating AND rating <= 5),
    body TEXT NOT NULL CHECK (LENGTH(body) <= 200),
    posted_at TIMESTAMP DEFAULT current_timestamp,
    CONSTRAINT only_one_review_per_level_per_user UNIQUE (level_id, user_id)
);
