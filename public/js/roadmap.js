const documentUpload = document.getElementById('documentUpload');
const generateMcqsBtn = document.getElementById('generateMcqsBtn');
const messageDisplay = document.getElementById('message');
const uploadSection = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const mcqSection = document.getElementById('mcqSection');
const mcqContainer = document.getElementById('mcqContainer');
const scoreDisplay = document.getElementById('scoreDisplay');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');

let mcqs = [];
let currentIndex = 0;
let score = 0;

generateMcqsBtn.disabled = true;

documentUpload.addEventListener('change', () => {
  generateMcqsBtn.disabled = !documentUpload.files.length;
});

generateMcqsBtn.onclick = async () => {
  const file = documentUpload.files[0];
  if (!file) return;

  uploadSection.classList.add('hidden');
  loadingSection.classList.remove('hidden');

  const formData = new FormData();
  formData.append('document', file);

  try {
    const res = await fetch('/upload-and-extract-text', { method: 'POST', body: formData });
    const data = await res.json();
    const text = data.textContent;

    const mcqRes = await fetch('/generate-mcqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText: text })
    });

    mcqs = await mcqRes.json();
    if (!Array.isArray(mcqs)) throw new Error('MCQ generation failed.');
    currentIndex = 0;
    score = 0;

    mcqs.forEach(q => q.userAnswer = null);

    loadingSection.classList.add('hidden');
    mcqSection.classList.remove('hidden');

    updateScoreDisplay();
    displayMCQ();

  } catch (err) {
    loadingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    messageDisplay.textContent = '❌ Error: ' + err.message;
  }
};

function displayMCQ() {
  const mcq = mcqs[currentIndex];
  mcqContainer.innerHTML = `<p class="question">${mcq.question}</p>`;
  const optionsGrid = document.createElement('div');
  optionsGrid.className = 'options-grid';

  for (const key of ['A', 'B', 'C', 'D']) {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.textContent = `${key}. ${mcq.options[key]}`;

    if (mcq.userAnswer) {
      if (key === mcq.correct_answer) opt.classList.add('correct');
      if (key === mcq.userAnswer && key !== mcq.correct_answer) opt.classList.add('wrong');
    }

    opt.onclick = () => {
      if (mcq.userAnswer) return;

      mcq.userAnswer = key;

      if (key === mcq.correct_answer) {
        opt.classList.add('correct');
        score++;
      } else {
        opt.classList.add('wrong');
        optionsGrid.querySelectorAll('.option').forEach(o => {
          if (o.textContent.startsWith(mcq.correct_answer)) o.classList.add('correct');
        });
      }

      updateScoreDisplay();
    };

    optionsGrid.appendChild(opt);
  }

  mcqContainer.appendChild(optionsGrid);

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === mcqs.length - 1;
  if (currentIndex === mcqs.length - 1) resetBtn.classList.remove('hidden');
  else resetBtn.classList.add('hidden');
}

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayMCQ();
  }
};

nextBtn.onclick = () => {
  if (currentIndex < mcqs.length - 1) {
    currentIndex++;
    displayMCQ();
  }
};

resetBtn.onclick = () => {
  location.reload();
};

function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score} / ${mcqs.length}`;
}
