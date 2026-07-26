const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const JUDGE0_URL = process.env.JUDGE0_URL || null; // optional Judge0 endpoint for running code
const JUDGE0_KEY = process.env.JUDGE0_KEY || null; // optional token
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null; // optional OpenAI key for generation

app.use(cors());
app.use(bodyParser.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get quiz by id (returns questions & choices but not correctIndex)
function getQuizById(quizId) {
  const quizRow = db.prepare('SELECT id, title FROM quizzes WHERE id = ?').get(quizId);
  if (!quizRow) return null;
  const questions = db.prepare('SELECT id, text FROM questions WHERE quizId = ?').all(quizId);
  const fullQuestions = questions.map(q => {
    const choices = db.prepare('SELECT text, choiceIndex FROM choices WHERE questionId = ? ORDER BY choiceIndex').all(q.id).map(c => c.text);
    return { id: q.id, text: q.text, choices };
  });
  return { id: quizRow.id, title: quizRow.title, questions: fullQuestions };
}

// Public: get first quiz (or quiz id query)
app.get('/api/quiz', (req, res) => {
  const quizId = req.query.id || 1;
  const quiz = getQuizById(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

// Submit answers and persist result
app.post('/api/submit', (req, res) => {
  const { answers, name, quizId } = req.body || {};
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers are required' });
  }
  const qId = quizId || 1;
  const questions = db.prepare('SELECT id, correctIndex FROM questions WHERE quizId = ?').all(qId);
  if (!questions || questions.length === 0) return res.status(400).json({ error: 'No questions for quiz' });

  let score = 0;
  questions.forEach(q => {
    const given = answers[q.id];
    if (given !== undefined && parseInt(given, 10) === q.correctIndex) score++;
  });

  const result = {
    name: name || 'Anonymous',
    total: questions.length,
    score,
    percent: Math.round((score / questions.length) * 100)
  };

  const insert = db.prepare('INSERT INTO results (userName, quizId, score, total, percent) VALUES (?,?,?,?,?)');
  insert.run(result.name, qId, result.score, result.total, result.percent);

  res.json(result);
});

// Auth: register
app.post('/api/register', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!['student', 'developer', 'recruiter'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const passwordHash = bcrypt.hashSync(password, 8);
  const info = db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run(name || '', email, passwordHash, role);
  const userId = info.lastInsertRowid;
  const token = jwt.sign({ id: userId, email, role, name: name || '' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role });
});

// Auth: login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT id, email, passwordHash, role, name FROM users WHERE email = ?').get(email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, name: user.name, role: user.role });
});

// Middleware: verify token
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing authorization' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin: create quiz (protected)
app.post('/api/admin/quiz', authMiddleware, (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { title, questions } = req.body || {};
  if (!title || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'Invalid payload' });
  const info = db.prepare('INSERT INTO quizzes (title) VALUES (?)').run(title);
  const quizId = info.lastInsertRowid;
  const insertQuestion = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)');
  const insertChoice = db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)');
  questions.forEach((q, qi) => {
    const qRes = insertQuestion.run(quizId, q.text, q.correctIndex);
    const qId = qRes.lastInsertRowid;
    q.choices.forEach((c, ci) => insertChoice.run(qId, c, ci));
  });
  res.json({ ok: true, quizId });
});

// Profile endpoints (save/get) - user must be logged in
app.post('/api/profile', authMiddleware, (req, res) => {
  const { linkedin, leetcode } = req.body || {};
  const userId = req.user.id;
  const existing = db.prepare('SELECT id FROM profiles WHERE userId = ?').get(userId);
  if (existing) {
    db.prepare('UPDATE profiles SET linkedin = ?, leetcode = ? WHERE userId = ?').run(linkedin || '', leetcode || '', userId);
  } else {
    db.prepare('INSERT INTO profiles (userId, linkedin, leetcode) VALUES (?,?,?)').run(userId, linkedin || '', leetcode || '');
  }
  res.json({ ok: true });
});

app.get('/api/profile/:userId', (req, res) => {
  const userId = req.params.userId;
  const p = db.prepare('SELECT linkedin, leetcode FROM profiles WHERE userId = ?').get(userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  res.json(p);
});

// Ensure an admin user and a sample quiz exist
function ensureSampleData() {
  const admin = db.prepare("SELECT id FROM users WHERE role='admin'").get();
  if (!admin) {
    const passwordHash = bcrypt.hashSync('admin123', 8);
    db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?,?,?,?)').run('Admin', 'admin@skilllence.local', passwordHash, 'admin');
    console.log('Created default admin: admin@skilllence.local / admin123');
  }
  const q = db.prepare('SELECT id FROM quizzes LIMIT 1').get();
  if (!q) {
    const info = db.prepare('INSERT INTO quizzes (title) VALUES (?)').run('Intro Programming Quiz');
    const quizId = info.lastInsertRowid;
    const insertQuestion = db.prepare('INSERT INTO questions (quizId, text, correctIndex) VALUES (?,?,?)');
    const insertChoice = db.prepare('INSERT INTO choices (questionId, text, choiceIndex) VALUES (?,?,?)');
    const q1 = insertQuestion.run(quizId, 'Which data structure uses LIFO?', 1);
    const q1Id = q1.lastInsertRowid;
    ['Queue','Stack','Tree','Graph'].forEach((c, i) => insertChoice.run(q1Id, c, i));
    const q2 = insertQuestion.run(quizId, 'What is time complexity of binary search on sorted array?', 1);
    const q2Id = q2.lastInsertRowid;
    ['O(n)','O(log n)','O(n log n)','O(1)'].forEach((c, i) => insertChoice.run(q2Id, c, i));
    const q3 = insertQuestion.run(quizId, 'Which language is primarily used for Android native apps?', 1);
    const q3Id = q3.lastInsertRowid;
    ['Swift','Kotlin','JavaScript','Ruby'].forEach((c, i) => insertChoice.run(q3Id, c, i));
    console.log('Inserted sample quiz');
  }
}

ensureSampleData();

// Animations metadata endpoint
app.get('/api/animations', (req, res) => {
  // In production these could be stored in DB or admin-managed.
  const animations = [
    { id: 1, name: 'Coding Loop', url: 'https://assets2.lottiefiles.com/packages/lf20_jcikwtux.json' },
    { id: 2, name: 'Abstract Tech', url: 'https://assets5.lottiefiles.com/packages/lf20_tfb3estd.json' }
  ];
  res.json(animations);
});

// ============ AI Test Endpoints ============
// Generate or fetch an AI test for a language. If OPENAI_API_KEY is configured, server may call OpenAI to generate a fresh task.
app.post('/api/ai-test/generate', authMiddleware, async (req, res) => {
  try {
    const { language, difficulty } = req.body || {};
    // If OPENAI_API_KEY is present you could call OpenAI to generate a new problem here.
    // For the prototype, fetch a sample from DB matching language/difficulty.
    const sample = db.prepare('SELECT id, title, language, difficulty, description, samples FROM ai_tests WHERE language = ? ORDER BY id LIMIT 1').get(language || 'python');
    if (!sample) return res.status(404).json({ error: 'No AI tests available for this language' });
    // return parsed samples
    const out = { id: sample.id, title: sample.title, language: sample.language, difficulty: sample.difficulty, description: sample.description, samples: JSON.parse(sample.samples) };
    res.json(out);
  } catch (err) {
    console.error('generate ai test error', err);
    res.status(500).json({ error: 'Failed to generate AI test' });
  }
});

// Submit code for AI test. If Judge0 is configured, this will forward the code for execution; otherwise a mock evaluation is performed.
app.post('/api/ai-test/submit', authMiddleware, async (req, res) => {
  try {
    const { testId, code, language } = req.body || {};
    if (!testId || !code) return res.status(400).json({ error: 'testId and code required' });
    const test = db.prepare('SELECT id, samples, language AS testLang FROM ai_tests WHERE id = ?').get(testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // If Judge0 configured, send a run request for each sample
    if (JUDGE0_URL) {
      try {
        const samples = JSON.parse(test.samples);
        // simple judge0 integration: create submissions for each sample and poll result
        const fetch = require('node-fetch');
        const submissions = [];
        for (const s of samples) {
          // create submission
          const body = { source_code: code, language_id: mapLanguageToJudge0(language || test.testLang), stdin: s.input };
          const createRes = await fetch(`${JUDGE0_URL}/submissions?wait=true`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': JUDGE0_KEY || '' }, body: JSON.stringify(body) });
          const jr = await createRes.json();
          submissions.push(jr);
        }
        // compute score: count passed
        let passed = 0;
        submissions.forEach(s => { if (s && s.status && s.status.id === 3) passed++; });
        const score = Math.round((passed / submissions.length) * 100);
        const insert = db.prepare('INSERT INTO ai_submissions (testId, userId, language, code, result, score) VALUES (?,?,?,?,?)');
        insert.run(testId, req.user.id, language || test.testLang, code, JSON.stringify(submissions), score);
        return res.json({ ok: true, score, details: submissions });
      } catch (e) {
        console.error('Judge0 error', e);
        // continue to fallback
      }
    }

    // Fallback/mock evaluation: compare outputs by running textual expectations—NO code execution for safety.
    const samples = JSON.parse(test.samples);
    // Mock evaluator: if code contains the expected output string as a literal, mark pass for that sample.
    let passed = 0;
    const details = [];
    for (const s of samples) {
      const expect = s.output.trim();
      const ok = code.includes(expect) || code.includes(`"${expect}"`) || code.includes(`'${expect}'`);
      details.push({ input: s.input, expected: expect, passed: ok });
      if (ok) passed++;
    }
    const score = Math.round((passed / samples.length) * 100);
    db.prepare('INSERT INTO ai_submissions (testId, userId, language, code, result, score) VALUES (?,?,?,?,?)').run(testId, req.user.id, language || test.testLang, code, JSON.stringify(details), score);
    res.json({ ok: true, score, details });
  } catch (err) {
    console.error('ai test submit error', err);
    res.status(500).json({ error: 'Failed to submit/test code' });
  }
});

// Helper: map language to Judge0 numeric id. This is a minimal mapping—extend as needed.
function mapLanguageToJudge0(lang) {
  const l = (lang || '').toLowerCase();
  if (l.includes('python')) return 71; // Python 3
  if (l.includes('javascript') || l === 'js') return 63; // Node.js
  if (l.includes('c++') || l === 'cpp') return 54; // C++ (g++)
  if (l.includes('java')) return 62; // Java
  if (l.includes('go')) return 20; // Go
  return 71; // default to python
}

// ============ STUDENT ENDPOINTS ============
// Get student's quiz history and skill progress
app.get('/api/student/progress', authMiddleware, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  const userName = req.user.name || req.user.email;
  const results = db.prepare('SELECT id, quizId, score, total, percent, createdAt FROM results WHERE userName = ? ORDER BY createdAt DESC LIMIT 20').all(userName);
  const stats = {
    totalAttempts: results.length,
    avgScore: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percent, 0) / results.length) : 0,
    highestScore: results.length > 0 ? Math.max(...results.map(r => r.percent)) : 0
  };
  res.json({ stats, results });
});

// ============ DEVELOPER ENDPOINTS ============
// Get developer's comprehensive skill analytics
app.get('/api/developer/analytics', authMiddleware, (req, res) => {
  if (req.user.role !== 'developer') return res.status(403).json({ error: 'Developers only' });
  const userId = req.user.id;
  const profile = db.prepare('SELECT linkedin, leetcode FROM profiles WHERE userId = ?').get(userId);
  const devResults = db.prepare('SELECT score, total, percent FROM results WHERE userName = ? ORDER BY createdAt DESC LIMIT 10').all(req.user.email);
  const skillScore = devResults.length > 0 ? Math.round(devResults.reduce((sum, r) => sum + r.percent, 0) / devResults.length) : 0;
  const analytics = {
    name: req.user.name || req.user.email,
    profile: profile || { linkedin: '', leetcode: '' },
    skillScore,
    recentTests: devResults.slice(0, 5),
    strengths: ['Problem Solving', 'Data Structures'],
    areasForImprovement: ['System Design', 'Advanced Algorithms']
  };
  res.json(analytics);
});

// ============ RECRUITER ENDPOINTS ============
// List all developers (searchable)
app.get('/api/recruiter/candidates', authMiddleware, (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ error: 'Recruiters only' });
  const search = req.query.search || '';
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  // Get users with developer role and their profiles
  const candidates = db.prepare(
    `SELECT u.id, u.name, u.email, p.linkedin, p.leetcode FROM users u
     LEFT JOIN profiles p ON u.id = p.userId
     WHERE u.role='developer' AND (u.name LIKE ? OR u.email LIKE ? OR p.linkedin LIKE ? OR p.leetcode LIKE ?)
     LIMIT ?`
  ).all(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit);
  res.json(candidates);
});

// Get candidate skill profile (recruiter view)
app.get('/api/recruiter/candidate/:userId', authMiddleware, (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ error: 'Recruiters only' });
  const userId = req.params.userId;
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ? AND role=\'developer\'').get(userId);
  if (!user) return res.status(404).json({ error: 'Developer not found' });
  const profile = db.prepare('SELECT linkedin, leetcode FROM profiles WHERE userId = ?').get(userId);
  const results = db.prepare('SELECT score, total, percent, createdAt FROM results WHERE userName = ? ORDER BY createdAt DESC LIMIT 10').all(user.email);
  const skillScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percent, 0) / results.length) : 0;
  const candidate = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: profile || { linkedin: '', leetcode: '' },
    skillScore,
    testAttempts: results.length,
    recentTests: results.slice(0, 3),
    skillTrend: results.map(r => r.percent)
  };
  res.json(candidate);
});

// Get recruiter dashboard stats
app.get('/api/recruiter/dashboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ error: 'Recruiters only' });
  const totalDevelopers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role='developer'").get().count;
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role='student'").get().count;
  const totalTests = db.prepare('SELECT COUNT(*) as count FROM results').get().count;
  const avgSkillScore = db.prepare('SELECT AVG(percent) as avg FROM results').get().avg || 0;
  res.json({
    totalDevelopers,
    totalStudents,
    totalTests,
    avgSkillScore: Math.round(avgSkillScore)
  });
});

// Fallback to index.html for SPA-like routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Skill lence server running on port ${PORT}`));
