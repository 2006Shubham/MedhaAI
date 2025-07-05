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

    loaderSection.classList.add('hidden');
    mcqSection.classList.remove('hidden');

    currentIndex = 0;
    answers = [];
    renderMCQ();

  } catch (err) {
    console.error(err);
    messageDisplay.textContent = 'Error occurred.';
  }
});

function renderMCQ() {
  const mcq = mcqs[currentIndex];
  mcqContainer.innerHTML = `
    <p class="question">${mcq.question}</p>
    <div class="options-grid">
      ${Object.entries(mcq.options).map(([key, val]) => `
        <div class="option" data-key="${key}">${key}. ${val}</div>
      `).join('')}
    </div>
    <p class="progress">Question ${currentIndex + 1} of ${mcqs.length}</p>
  `;

  document.querySelectorAll('.option').forEach(opt => {
    opt.onclick = () => {
      answers.push({ question: mcq.question, selected: opt.dataset.key });
      if (currentIndex < mcqs.length - 1) {
        currentIndex++;
        renderMCQ();
      } else {
        buildRoadmap(); // 👉 LOCAL STATIC, no Gemini!
      }
    };
  });
}

function buildRoadmap() {
  mcqSection.classList.add('hidden');
  roadmapSection.classList.remove('hidden');

  const steps = [
    { title: 'Step 1: Basics', description: 'Learn basics.', details: 'Do this and that.' },
    { title: 'Step 2: Practice', description: 'Practice topics.', details: 'Hands-on exercises.' },
    { title: 'Step 3: Quiz', description: 'Test yourself.', details: 'Solve quizzes.' },
    { title: 'Step 4: Projects', description: 'Build small projects.', details: 'Apply knowledge.' },
    { title: 'Step 5: Review', description: 'Revise concepts.', details: 'Repeat important parts.' },
    { title: 'Step 6: Peer Feedback', description: 'Discuss with peers.', details: 'Get feedback.' },
    { title: 'Step 7: Mock Test', description: 'Take mock exams.', details: 'Prepare well.' },
    { title: 'Step 8: Final Step', description: 'Final review.', details: 'Ready to deploy.' }
  ];

  cardsContainer.innerHTML = '';
  steps.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = `card ${idx ? 'locked' : ''}`;
    card.innerHTML = `
      <h3>${step.title}</h3>
      <p>${step.description}</p>
      <p>${step.details}</p>
      ${idx < steps.length - 1 ? `<button class="unlockBtn">Unlock Next</button>` : `<p>🎉 Done!</p>`}
    `;
    cardsContainer.appendChild(card);
  });

  document.querySelectorAll('.unlockBtn').forEach((btn, idx) => {
    btn.onclick = () => {
      btn.parentElement.classList.add('unlocked');
      const next = cardsContainer.children[idx + 1];
      if (next) next.classList.remove('locked');
      progressFill.style.width = `${Math.round(((idx + 1) / steps.length) * 100)}%`;
    };
  });
}
