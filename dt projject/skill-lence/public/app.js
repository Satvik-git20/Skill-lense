// Simple frontend interactions for Skill lence prototype

function $(sel) { return document.querySelector(sel) }
function $all(sel) { return Array.from(document.querySelectorAll(sel)) }

// Tabs
$all('.tab').forEach(btn => btn.addEventListener('click', () => {
  $all('.tab').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  const id = btn.id.replace('tab-','')
  $all('.panel').forEach(p=>p.classList.remove('visible'))
  $(`#${id}`).classList.add('visible')
}))

// Developer: save links locally
$('#dev-save').addEventListener('click', () => {
  const li = $('#dev-linkedin').value.trim();
  const lc = $('#dev-leetcode').value.trim();
  const profile = { linkedin: li, leetcode: lc };
  localStorage.setItem('skilllence_profile', JSON.stringify(profile));
  alert('Profile saved locally. Recruiters can paste these URLs to open them.');
});

$('#dev-open').addEventListener('click', () => {
  const li = $('#dev-linkedin').value.trim();
  const lc = $('#dev-leetcode').value.trim();
  if (li) window.open(li, '_blank');
  if (lc) window.open(lc, '_blank');
});

// Recruiter open
$('#rec-open').addEventListener('click', () => {
  const li = $('#rec-linkedin').value.trim();
  const lc = $('#rec-leetcode').value.trim();
  if (!li && !lc) return alert('Paste a LinkedIn or LeetCode URL to open.');
  if (li) window.open(li, '_blank');
  if (lc) window.open(lc, '_blank');
});

// Student: load quiz
$('#start-quiz').addEventListener('click', async () => {
  const container = $('#quiz-container');
  container.innerHTML = 'Loading quiz...';
  try {
    const res = await fetch('/api/quiz');
    const quiz = await res.json();
    renderQuiz(quiz);
  } catch (err) {
    container.innerHTML = 'Failed to load quiz.';
  }
});

function renderQuiz(quiz) {
  const container = $('#quiz-container');
  container.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = quiz.title;
  container.appendChild(title);

  quiz.questions.forEach(q => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    const qText = document.createElement('p');
    qText.textContent = q.text;
    qDiv.appendChild(qText);

    q.choices.forEach((c, idx) => {
      const id = `q-${q.id}-c-${idx}`;
      const label = document.createElement('label');
      label.style.display = 'block';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q-${q.id}`;
      input.value = idx;
      input.id = id;
      const span = document.createElement('span');
      span.textContent = ' ' + c;
      label.appendChild(input);
      label.appendChild(span);
      qDiv.appendChild(label);
    });

    container.appendChild(qDiv);
  });

  const submit = document.createElement('button');
  submit.textContent = 'Submit Answers';
  submit.addEventListener('click', submitAnswers);
  container.appendChild(submit);
}

async function submitAnswers() {
  const name = $('#student-name').value.trim();
  const answers = {};
  $all('[name^="q-"]').forEach(inp => {
    if (inp.checked) answers[inp.name.replace('q-','')] = parseInt(inp.value,10);
  });

  const payload = { name, answers };
  try {
    const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const result = await res.json();
    $('#result').innerHTML = `<strong>${result.name}</strong> scored ${result.score}/${result.total} (${result.percent}%)`;
  } catch (err) {
    $('#result').textContent = 'Failed to submit answers.';
  }
}

// On load, populate developer fields if saved
window.addEventListener('load', () => {
  const raw = localStorage.getItem('skilllence_profile');
  if (raw) {
    try { const p = JSON.parse(raw); $('#dev-linkedin').value = p.linkedin || ''; $('#dev-leetcode').value = p.leetcode || ''; } catch(e){}
  }
  // load animations from API and initialize Lottie
  loadAnimations();
});

// Load animations metadata and play first animation
async function loadAnimations() {
  try {
    const res = await fetch('/api/animations');
    const list = await res.json();
    if (!list || !list.length) return;
    const anim = list[0];
    const container = document.getElementById('lottie');
    if (!container) return;
    // wait for lottie lib
    const waitForLottie = () => new Promise(resolve => {
      const check = () => { if (window.lottie) return resolve(window.lottie); setTimeout(check, 50); };
      check();
    });
    const lottie = await waitForLottie();
    lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: anim.url
    });
    // reveal container with CSS transition
    setTimeout(() => container.classList.add('visible'), 60);
  } catch (err) {
    // ignore if animations fail
    console.warn('Failed to load animations', err);
  }
}
