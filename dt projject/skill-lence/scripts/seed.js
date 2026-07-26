const db = require('../db');
const bcrypt = require('bcryptjs');

console.log('Seeding database with sample data...');

// Clear existing users (except admin) for a fresh demo
db.exec(`DELETE FROM results; DELETE FROM choices; DELETE FROM questions; DELETE FROM quizzes; DELETE FROM profiles; DELETE FROM users WHERE role != 'admin';`);

// Create sample users
const pwd = bcrypt.hashSync('test123', 8);
const student1 = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('Alice Chen', 'alice@skilllence.local', pwd, 'student');
const student2 = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('Bob Kumar', 'bob@skilllence.local', pwd, 'student');
const dev1 = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('Carol Developer', 'carol@skilllence.local', pwd, 'developer');
const dev2 = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('David Tech', 'david@skilllence.local', pwd, 'developer');
const recruiter1 = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('Eve Recruiter', 'eve@skilllence.local', pwd, 'recruiter');

// Add profiles for developers
db.prepare('INSERT INTO profiles (userId, linkedin, leetcode) VALUES (?,?,?)').run(dev1.lastInsertRowid, 'https://linkedin.com/in/carol-dev', 'https://leetcode.com/carol');
db.prepare('INSERT INTO profiles (userId, linkedin, leetcode) VALUES (?,?,?)').run(dev2.lastInsertRowid, 'https://linkedin.com/in/david-tech', 'https://leetcode.com/david');

// Create sample quizzes
const quiz1 = db.prepare('INSERT INTO quizzes (title) VALUES (?)').run('JavaScript Fundamentals');
const quiz2 = db.prepare('INSERT INTO quizzes (title) VALUES (?)').run('Data Structures');

// Add questions and choices for Quiz 1
const q1_1 = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)').run(quiz1.lastInsertRowid, 'What is the output of typeof NaN?', 1);
['number', 'object', 'NaN', 'undefined'].forEach((c, i) => db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)').run(q1_1.lastInsertRowid, c, i));

const q1_2 = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)').run(quiz1.lastInsertRowid, 'Which is NOT a primitive type?', 3);
['string', 'number', 'boolean', 'object'].forEach((c, i) => db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)').run(q1_2.lastInsertRowid, c, i));

// Add questions and choices for Quiz 2
const q2_1 = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)').run(quiz2.lastInsertRowid, 'Which search is O(log n)?', 1);
['Linear Search', 'Binary Search', 'Bubble Sort', 'Insertion Sort'].forEach((c, i) => db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)').run(q2_1.lastInsertRowid, c, i));

const q2_2 = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)').run(quiz2.lastInsertRowid, 'Stack uses which principle?', 1);
['FIFO', 'LIFO', 'FILO', 'Random'].forEach((c, i) => db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)').run(q2_2.lastInsertRowid, c, i));

// Add sample results for developers
const devResults = [
  { user: 'carol@skilllence.local', quiz: quiz1.lastInsertRowid, score: 2, total: 2 },
  { user: 'carol@skilllence.local', quiz: quiz2.lastInsertRowid, score: 1, total: 2 },
  { user: 'david@skilllence.local', quiz: quiz1.lastInsertRowid, score: 2, total: 2 },
  { user: 'david@skilllence.local', quiz: quiz2.lastInsertRowid, score: 2, total: 2 }
];

devResults.forEach(r => {
  const percent = Math.round((r.score / r.total) * 100);
  db.prepare('INSERT INTO results (userName, quizId, score, total, percent) VALUES (?,?,?,?,?)').run(r.user, r.quiz, r.score, r.total, percent);
});

console.log('✓ Sample users created:');
console.log('  Student: alice@skilllence.local / test123');
console.log('  Student: bob@skilllence.local / test123');
console.log('  Developer: carol@skilllence.local / test123');
console.log('  Developer: david@skilllence.local / test123');
console.log('  Recruiter: eve@skilllence.local / test123');
console.log('✓ Sample quizzes and results added');

// Add sample AI tests
const sampleTests = [
  {
    title: 'Sum of Two Numbers',
    language: 'python',
    difficulty: 'easy',
    description: 'Read two integers from input and print their sum.',
    samples: JSON.stringify([{ input: '2 3', output: '5' }])
  },
  {
    title: 'Reverse String',
    language: 'javascript',
    difficulty: 'easy',
    description: 'Read a single line and print the reversed string.',
    samples: JSON.stringify([{ input: 'hello', output: 'olleh' }])
  },
  {
    title: 'Fibonacci (nth)',
    language: 'cpp',
    difficulty: 'medium',
    description: 'Given n, print the n-th Fibonacci number (0-indexed).',
    samples: JSON.stringify([{ input: '5', output: '5' }])
  }
];

const insertAi = db.prepare('INSERT INTO ai_tests (title, language, difficulty, description, samples) VALUES (?,?,?,?,?)');
sampleTests.forEach(t => insertAi.run(t.title, t.language, t.difficulty, t.description, t.samples));

console.log('✓ Sample AI tests added');
