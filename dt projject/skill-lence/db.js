const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'skilllence.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  passwordHash TEXT,
  role TEXT DEFAULT 'student'
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER UNIQUE,
  linkedin TEXT,
  leetcode TEXT,
  FOREIGN KEY(userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quizId INTEGER,
  text TEXT,
  correctIndex INTEGER,
  FOREIGN KEY(quizId) REFERENCES quizzes(id)
);

CREATE TABLE IF NOT EXISTS choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionId INTEGER,
  text TEXT,
  choiceIndex INTEGER,
  FOREIGN KEY(questionId) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userName TEXT,
  quizId INTEGER,
  score INTEGER,
  total INTEGER,
  percent INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  language TEXT,
  difficulty TEXT,
  description TEXT,
  samples TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  testId INTEGER,
  userId INTEGER,
  language TEXT,
  code TEXT,
  result TEXT,
  score INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(testId) REFERENCES ai_tests(id),
  FOREIGN KEY(userId) REFERENCES users(id)
);
`);

module.exports = db;
