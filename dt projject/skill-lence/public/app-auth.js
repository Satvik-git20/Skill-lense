// Auth JS - handle signup/login and redirect to dashboard
const token = localStorage.getItem('skilllence_token');
if (token) window.location.href = '/dashboard.html';

// Tab switching
document.getElementById('login-tab').addEventListener('click', () => {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('visible'));
  document.getElementById('login-tab').classList.add('active');
  document.getElementById('login-form').classList.add('visible');
});

document.getElementById('signup-tab').addEventListener('click', () => {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('visible'));
  document.getElementById('signup-tab').classList.add('active');
  document.getElementById('signup-form').classList.add('visible');
});

// Login
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('skilllence_token', data.token);
    localStorage.setItem('skilllence_user', JSON.stringify({ email, name: data.name, role: data.role }));
    window.location.href = '/dashboard.html';
  } else {
    document.getElementById('login-error').textContent = data.error || 'Login failed';
  }
});

// Signup
document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-pass').value;
  const role = document.getElementById('signup-role').value;
  if (!role) return alert('Please select a role');
  const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role }) });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('skilllence_token', data.token);
    localStorage.setItem('skilllence_user', JSON.stringify({ email, name, role }));
    window.location.href = '/dashboard.html';
  } else {
    document.getElementById('signup-error').textContent = data.error || 'Signup failed';
  }
});

// Load animations on homepage
fetch('/api/animations')
  .then(r => r.json())
  .then(list => {
    if (!list || !list.length) return;
    const anim = list[0];
    const waitForLottie = () => new Promise(resolve => {
      const check = () => { if (window.lottie) return resolve(window.lottie); setTimeout(check, 50); };
      check();
    });
    waitForLottie().then(lottie => {
      lottie.loadAnimation({
        container: document.getElementById('lottie'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: anim.url
      });
      setTimeout(() => document.getElementById('lottie').classList.add('visible'), 60);
    });
  })
  .catch(e => console.warn('Animations load failed', e));
