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

const toMcqBtn = document.getElementById('toMcqBtn');
const toLearningBtn = document.getElementById('toLearningBtn');
const returnBtn = document.getElementById('returnBtn');

let extractedText = '';
let mcqs = [];
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
    const res = await fetch('/upload-and-extract-text', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    extractedText = data.textContent;

    const mcqRes = await fetch('/generate-mcqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText: extractedText })
    });
    mcqs = await mcqRes.json().then(arr => arr.slice(0, 5));

    loaderSection.classList.add('hidden');
    mcqSection.classList.remove('hidden');

    currentIndex = 0;
    renderMCQ();

  } catch (err) {
    messageDisplay.textContent = '❌ Error, try again.';
    console.error(err);
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
  `;
  document.querySelectorAll('.option').forEach(opt => {
    opt.onclick = () => {
      if (currentIndex < mcqs.length - 1) {
        currentIndex++;
        renderMCQ();
      } else {
        buildRoadmap();
      }
    };
  });
}

function buildRoadmap() {
  mcqSection.classList.add('hidden');
  roadmapSection.classList.remove('hidden');

  const roadmapSteps = [
    "Step 1: Overview",
    "Step 2: Deep Dive",
    "Step 3: Practice Basics",
    "Step 4: Hands-On Task",
    "Step 5: Small Project",
    "Step 6: Peer Review",
    "Step 7: Mock Test",
    "Step 8: Final Review"
  ];

  cardsContainer.innerHTML = '';
  roadmapSteps.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = `card ${idx ? 'locked' : ''}`;
    card.innerHTML = `
      <h3>${step}</h3>
      <p>Details for ${step} based on your input.</p>
      ${idx < roadmapSteps.length - 1 ? `<button class="unlockBtn">Unlock Next</button>` : ''}
    `;
    cardsContainer.appendChild(card);
  });

  document.querySelectorAll('.unlockBtn').forEach((btn, idx) => {
    btn.onclick = () => {
      btn.parentElement.classList.add('unlocked');
      const next = cardsContainer.children[idx + 1];
      if (next) next.classList.remove('locked');
      progressFill.style.width = `${((idx + 1) / roadmapSteps.length) * 100}%`;
    };
  });

  toMcqBtn.onclick = () => location.href = '/mcq.html';
  toLearningBtn.onclick = () => location.href = '/interactive.html';
  returnBtn.onclick = () => location.href = '/';
}
