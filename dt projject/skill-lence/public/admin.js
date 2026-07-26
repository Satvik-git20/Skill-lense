async function postJSON(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

document.getElementById('admin-login').addEventListener('click', async () => {
  const email = document.getElementById('admin-email').value.trim();
  const pass = document.getElementById('admin-pass').value;
  if (!email || !pass) return alert('Email + password');
  const r = await postJSON('/api/login', { email, password: pass });
  if (r.token) {
    localStorage.setItem('skilllence_token', r.token);
    document.getElementById('admin-status').textContent = 'Logged in as ' + (r.name || email);
  } else {
    document.getElementById('admin-status').textContent = 'Login failed';
  }
});

document.getElementById('create-quiz').addEventListener('click', async () => {
  const token = localStorage.getItem('skilllence_token');
  if (!token) return alert('Login first');
  let questions;
  try { questions = JSON.parse(document.getElementById('quiz-json').value); } catch (e) { return alert('Invalid JSON'); }
  const title = document.getElementById('quiz-title').value.trim() || 'Untitled';
  const payload = { title, questions };
  const r = await postJSON('/api/admin/quiz', payload, token);
  if (r.ok) document.getElementById('create-result').textContent = 'Created quiz #' + r.quizId;
  else document.getElementById('create-result').textContent = 'Error: ' + (r.error || JSON.stringify(r));
});
