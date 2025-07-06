const documentUpload = document.getElementById('documentUpload');
const generatePathBtn = document.getElementById('generatePathBtn');
const messageDisplay = document.getElementById('message');

const uploadSection = document.getElementById('uploadSection');
const loaderSection = document.getElementById('loaderSection');
const mcqSection = document.getElementById('mcqSection');
const roadmapSection = document.getElementById('roadmapSection');

const mcqContainer = document.getElementById('mcqContainer');
const cardsContainer = document.getElementById('cardsContainer');
const progressFill = document.getElementById('progressFill');

let extractedText = '';
let mcqs = [];
let answers = [];
let currentIndex = 0;

documentUpload.addEventListener('change', () => {
  generatePathBtn.disabled = !documentUpload.files.length;
});

generatePathBtn.addEventListener('click', async () => {
  const file = documentUpload.files[0];
  if (!file) return;

  uploadSection.classList.add('hidden');
  loaderSection.classList.remove('hidden');
  messageDisplay.textContent = '⏳ Extracting & generating MCQs...';

  const formData = new FormData();
  formData.append('document', file);

  try {
    const res = await fetch('/upload-and-extract-text', { method: 'POST', body: formData });
    const data = await res.json();
    extractedText = data.textContent;

    const mcqRes = await fetch('/generate-mcqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText: extractedText })
    });

    mcqs = await mcqRes.json();
    mcqs = mcqs.slice(0, 5);
    answers = [];
    currentIndex = 0;

    loaderSection.classList.add('hidden');
    mcqSection.classList.remove('hidden');

    renderMCQ();

  } catch (err) {
    messageDisplay.textContent = '❌ Error: ' + err.message;
    console.error(err);
  }
});

function renderMCQ() {
  const mcq = mcqs[currentIndex];
  mcqContainer.innerHTML = `
    <p class="question">${mcq.question}</p>
    <div class="options-grid">
      ${Object.entries(mcq.options).map(([k, v]) => `<div class="option" data-key="${k}">${k}. ${v}</div>`).join('')}
    </div>
  `;

  document.querySelectorAll('.option').forEach(opt => {
    opt.onclick = () => {
      answers.push({ question: mcq.question, selected: opt.dataset.key });
      if (currentIndex < mcqs.length - 1) {
        currentIndex++;
        renderMCQ();
      } else {
        buildRoadmap();
      }
    };
  });
}

async function buildRoadmap() {
  mcqSection.classList.add('hidden');
  loaderSection.classList.remove('hidden');
  messageDisplay.textContent = '🔍 Building roadmap...';

  try {
    const res = await fetch('/generate-roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, textContent: extractedText })
    });

    if (!res.ok) throw new Error('Roadmap request failed');

    const data = await res.json();
    loaderSection.classList.add('hidden');
    roadmapSection.classList.remove('hidden');

    renderCards(data.roadmap);

  } catch (err) {
    console.error('❌ Path.js Error:', err);
    messageDisplay.textContent = '❌ Roadmap failed.';
  }
}

function renderCards(roadmap) {
  cardsContainer.innerHTML = '';
  roadmap.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = `card ${idx ? 'locked' : ''}`;
    card.innerHTML = `
      <h3>${step.title}</h3>
      <p>${step.description}</p>
      <p>${step.details}</p>
      ${step.resources && step.resources.length ? `<div class="resources">
        ${step.resources.map(link => `<a href="${link}" target="_blank">${link}</a>`).join('<br>')}
      </div>` : ''}
      ${idx < roadmap.length - 1 ? `<button class="unlockBtn">Unlock Next</button>` : `
        <div class="final-actions">
          <button onclick="location.href='/mcq.html'">📚 MCQs</button>
          <button onclick="location.href='/interactive.html'">🚀 Interactive</button>
          <button onclick="location.href='/'">🏠 Home</button>
        </div>`}
    `;
    cardsContainer.appendChild(card);
  });

  document.querySelectorAll('.unlockBtn').forEach((btn, idx) => {
    btn.onclick = () => {
      btn.parentElement.classList.add('unlocked');
      const next = cardsContainer.children[idx + 1];
      if (next) next.classList.remove('locked');
      progressFill.style.width = `${Math.round(((idx + 1) / roadmap.length) * 100)}%`;
    };
  });
}
