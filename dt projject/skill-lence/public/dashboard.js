// Dashboard JS - role-based views and API interactions

const token = localStorage.getItem('skilllence_token');
const user = JSON.parse(localStorage.getItem('skilllence_user') || '{}');

if (!token) window.location.href = '/';

async function apiCall(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...options.headers };
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/';
  }
  return res.json();
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/';
});

// Show dashboard and load role-based data
document.getElementById('dashboard').style.display = 'block';

// Tab navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    tab.classList.add('active');
    const role = tab.dataset.role;
    document.getElementById(role + '-dash').style.display = 'block';
    if (role === 'student') loadStudentData();
    if (role === 'developer') loadDeveloperData();
    if (role === 'recruiter') loadRecruiterData();
  });
});

// Load animations
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

// ===== STUDENT =====
async function loadStudentData() {
  const data = await apiCall('/api/student/progress');
  const { stats, results } = data;
  document.getElementById('student-attempts').textContent = stats.totalAttempts;
  document.getElementById('student-avg').textContent = stats.avgScore + '%';
  document.getElementById('student-best').textContent = stats.highestScore + '%';
  const list = document.getElementById('student-results');
  list.innerHTML = results.map(r => `
    <div class="result-item">
      <span>${r.quizId} — ${r.score}/${r.total} (${r.percent}%)</span>
      <span class="date">${new Date(r.createdAt).toLocaleDateString()}</span>
    </div>
  `).join('');
}

// ===== DEVELOPER =====
async function loadDeveloperData() {
  const data = await apiCall('/api/developer/analytics');
  const { name, profile, skillScore, strengths, areasForImprovement } = data;
  document.getElementById('dev-name').textContent = name;
  document.getElementById('dev-skill-score').textContent = skillScore + '%';
  document.getElementById('dev-skill-bar').style.width = skillScore + '%';
  if (profile.linkedin) {
    const link = document.getElementById('dev-linkedin-link');
    link.href = profile.linkedin;
    link.style.display = 'inline';
  }
  if (profile.leetcode) {
    const link = document.getElementById('dev-leetcode-link');
    link.href = profile.leetcode;
    link.style.display = 'inline';
  }
  document.getElementById('dev-strengths').innerHTML = strengths.map(s => `<li>${s}</li>`).join('');
  document.getElementById('dev-areas').innerHTML = areasForImprovement.map(a => `<li>${a}</li>`).join('');
}

document.getElementById('dev-edit-profile').addEventListener('click', () => {
  document.getElementById('profile-modal').style.display = 'block';
  // Pre-fill if we have profile data
  fetch('/api/profile/' + user.id)
    .then(r => r.json())
    .catch(() => {})
    .then(p => {
      if (p && p.linkedin) document.getElementById('modal-linkedin').value = p.linkedin;
      if (p && p.leetcode) document.getElementById('modal-leetcode').value = p.leetcode;
    });
});

document.getElementById('profile-modal-close').addEventListener('click', () => {
  document.getElementById('profile-modal').style.display = 'none';
});

document.getElementById('profile-save-btn').addEventListener('click', async () => {
  const linkedin = document.getElementById('modal-linkedin').value;
  const leetcode = document.getElementById('modal-leetcode').value;
  await apiCall('/api/profile', { method: 'POST', body: JSON.stringify({ linkedin, leetcode }) });
  document.getElementById('profile-modal').style.display = 'none';
  loadDeveloperData();
});

// ===== RECRUITER =====
async function loadRecruiterData() {
  const dashboard = await apiCall('/api/recruiter/dashboard');
  document.getElementById('recruiter-total-devs').textContent = dashboard.totalDevelopers;
  document.getElementById('recruiter-total-students').textContent = dashboard.totalStudents;
  document.getElementById('recruiter-avg-score').textContent = dashboard.avgSkillScore + '%';
  searchCandidates();
}

async function searchCandidates() {
  const search = document.getElementById('recruiter-search').value;
  const candidates = await apiCall('/api/recruiter/candidates?search=' + encodeURIComponent(search));
  const grid = document.getElementById('recruiter-candidates');
  grid.innerHTML = candidates.map(c => `
    <div class="candidate-card" onclick="viewCandidate(${c.id})">
      <h4>${c.name || c.email}</h4>
      <p>${c.email}</p>
      ${c.linkedin ? `<a href="${c.linkedin}" target="_blank">LinkedIn</a>` : ''}
      ${c.leetcode ? `<a href="${c.leetcode}" target="_blank">LeetCode</a>` : ''}
    </div>
  `).join('');
}

document.getElementById('recruiter-search-btn').addEventListener('click', searchCandidates);

async function viewCandidate(userId) {
  const candidate = await apiCall('/api/recruiter/candidate/' + userId);
  const detail = document.getElementById('candidate-detail');
  detail.innerHTML = `
    <h3>${candidate.name}</h3>
    <p>${candidate.email}</p>
    <div class="candidate-score">
      <span>Skill Score: ${candidate.skillScore}%</span>
      <div class="score-bar"><div class="score-fill" style="width:${candidate.skillScore}%"></div></div>
    </div>
    <p>Test Attempts: ${candidate.testAttempts}</p>
    ${candidate.profile.linkedin ? `<p><a href="${candidate.profile.linkedin}" target="_blank">LinkedIn</a></p>` : ''}
    ${candidate.profile.leetcode ? `<p><a href="${candidate.profile.leetcode}" target="_blank">LeetCode</a></p>` : ''}
    <p>Recent Scores: ${candidate.skillTrend.join(', ')}%</p>
  `;
  document.getElementById('candidate-modal').style.display = 'block';
}

document.getElementById('candidate-modal-close').addEventListener('click', () => {
  document.getElementById('candidate-modal').style.display = 'none';
});

// Load initial data based on role
if (user.role === 'student') loadStudentData();
if (user.role === 'developer') loadDeveloperData();
if (user.role === 'recruiter') loadRecruiterData();
