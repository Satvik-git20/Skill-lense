async function api(path, opts = {}) {
  const token = localStorage.getItem('skilllence_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(path, { headers, ...opts });
  return res.json();
}

document.getElementById('ai-generate').addEventListener('click', async () => {
  const language = document.getElementById('ai-language').value;
  const difficulty = document.getElementById('ai-difficulty').value;
  const el = document.getElementById('ai-test');
  el.innerHTML = 'Loading...';
  try {
    const data = await api('/api/ai-test/generate', { method: 'POST', body: JSON.stringify({ language, difficulty }) });
    if (data.error) return el.innerHTML = `<div class="error">${data.error}</div>`;
    window.currentAiTest = data;
    el.innerHTML = `<h3>${data.title} <small>(${data.language} / ${data.difficulty})</small></h3><p>${data.description}</p><h4>Samples</h4>${data.samples.map(s => `<pre>in: ${s.input}\nout: ${s.output}</pre>`).join('')}`;
    document.getElementById('ai-editor-area').style.display = 'block';
    document.getElementById('ai-code').value = getStarterTemplate(data.language);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to generate test</div>`;
  }
});

document.getElementById('ai-submit').addEventListener('click', async () => {
  const code = document.getElementById('ai-code').value;
  const test = window.currentAiTest;
  if (!test) return alert('Load a test first');
  const resultEl = document.getElementById('ai-result');
  resultEl.innerHTML = 'Submitting...';
  try {
    const r = await api('/api/ai-test/submit', { method: 'POST', body: JSON.stringify({ testId: test.id, code, language: test.language }) });
    if (r.error) return resultEl.innerHTML = `<div class="error">${r.error}</div>`;
    resultEl.innerHTML = `<div class="result">Score: ${r.score}%</div><pre>${JSON.stringify(r.details || r, null, 2)}</pre>`;
  } catch (e) {
    resultEl.innerHTML = `<div class="error">Submission failed</div>`;
  }
});

function getStarterTemplate(lang) {
  const l = (lang || '').toLowerCase();
  if (l.includes('python')) return `# Read input and implement solution\n# Example:\n# input: 2 3\n# output: 5\n\nimport sys\ndata = sys.stdin.read().strip().split()\n# write your code here\nprint(sum(map(int,data)))`;
  if (l.includes('javascript')) return `// Node.js starter\nconst fs = require('fs');\nconst input = fs.readFileSync(0,'utf8').trim().split(/\s+/);\n// implement and print result\nconsole.log(input.join(' '));`;
  if (l.includes('cpp') || l === 'cpp') return `#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  ios::sync_with_stdio(false);\n  cin.tie(NULL);\n  // read input and implement\n  return 0;\n}`;
  if (l.includes('java')) return `import java.util.*;\npublic class Main{\n  public static void main(String[] args){\n    Scanner s = new Scanner(System.in);\n    // implement\n  }\n}`;
  return `// starter template`;
}
