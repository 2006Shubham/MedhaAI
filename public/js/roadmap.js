const uploadTab = document.getElementById('uploadTab');
const topicTab = document.getElementById('topicTab');
const uploadSection = document.getElementById('uploadSection');
const topicSection = document.getElementById('topicSection');
const generateBtn = document.getElementById('generateBtn');
const topicInput = document.getElementById('topicInput');
const mcqSection = document.getElementById('mcqSection');
const cardsSection = document.getElementById('cardsSection');

// ✅ Tabs toggle
uploadTab.onclick = () => {
  uploadTab.classList.add('border-b-4', 'border-purple-700');
  topicTab.classList.remove('border-b-4', 'border-purple-700');
  uploadSection.classList.remove('hidden');
  topicSection.classList.add('hidden');
};

topicTab.onclick = () => {
  topicTab.classList.add('border-b-4', 'border-purple-700');
  uploadTab.classList.remove('border-b-4', 'border-purple-700');
  topicSection.classList.remove('hidden');
  uploadSection.classList.add('hidden');
};

// ✅ Generate MCQs → handle RAW safely
generateBtn.onclick = async () => {
  generateBtn.classList.add('hidden');
  uploadSection.classList.add('hidden');
  topicSection.classList.add('hidden');

  mcqSection.classList.remove('hidden');
  mcqSection.innerHTML = `
    <p class="text-lg text-gray-600 mb-4 animate-pulse">
      Generating your MCQs... please wait...
    </p>
  `;

  const prompt = topicInput.value.trim() || "Java basics";

  try {
    const res = await fetch('/generate-mcq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: prompt })
    });

    const data = await res.json();
    console.log('💡 RAW from server:', data.raw);

    let clean = data.raw || '';
    clean = clean.trim().replace(/```json/gi, '').replace(/```/g, '').trim();

    let mcqs;
    try {
      // Try direct parse
      mcqs = JSON.parse(clean);
    } catch {
      console.warn('⚡ Direct parse failed — fallback to slice...');
      const start = clean.indexOf('[');
      const end = clean.lastIndexOf(']');
      if (start === -1 || end === -1) throw new Error('No [ ] found in RAW!');
      const sliced = clean.substring(start, end + 1);
      mcqs = JSON.parse(sliced);
    }

    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error('MCQ JSON empty or invalid!');
    }

    buildMCQs(mcqs);

  } catch (err) {
    mcqSection.innerHTML = `<p class="text-red-500">❌ Failed to generate MCQs. Please try again.</p>`;
    console.error(err);
  }
};

// ✅ Build MCQ cards
function buildMCQs(mcqs) {
  mcqSection.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-purple-700">Answer these:</h2>`;

  mcqs.forEach((mcq, i) => {
    const div = document.createElement('div');
    div.className = "mb-6 p-6 bg-white rounded-xl shadow transition-transform";

    div.innerHTML = `
      <p class="mb-4 font-semibold text-lg">${mcq.q}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${mcq.a.map((opt, idx) => `
          <div class="option border border-gray-300 rounded-lg p-4 cursor-pointer hover:border-purple-600 hover:scale-105 transition"
               data-q="${i}" data-idx="${idx}">${opt}</div>
        `).join('')}
      </div>
    `;
    mcqSection.appendChild(div);
  });

  const btn = document.createElement('button');
  btn.textContent = "Submit Answers";
  btn.className = "mt-4 bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition";
  btn.onclick = buildPath;
  mcqSection.appendChild(btn);

  document.querySelectorAll('.option').forEach(opt => {
    opt.onclick = () => {
      const siblings = opt.parentElement.querySelectorAll('.option');
      siblings.forEach(s => s.classList.remove('border-purple-600', 'bg-purple-50'));
      opt.classList.add('border-purple-600', 'bg-purple-50');
    };
  });
}

// ✅ Build personalized path
function buildPath() {
  mcqSection.classList.add('hidden');
  cardsSection.classList.remove('hidden');

  const steps = [
    "Step 1: Fundamentals",
    "Step 2: Syntax & Variables",
    "Step 3: Control Flow",
    "Step 4: Functions",
    "Step 5: OOP Basics",
    "Step 6: Mini Project",
    "Step 7: Revision & Tests",
    "Try Out Yourself"
  ];

  cardsSection.innerHTML = `
    <h2 class="text-2xl font-bold mb-4 text-purple-700">Your Personalized Path</h2>
    <div class="flex flex-col gap-4" id="cards"></div>
    <div class="w-full bg-gray-200 rounded-full h-4 mt-4">
      <div id="progress" class="bg-purple-600 h-4 rounded-full w-0 transition-all duration-500"></div>
    </div>
  `;

  const cardsDiv = document.getElementById('cards');

  steps.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = `p-6 bg-white rounded-xl shadow border hover:shadow-xl transition transform ${idx ? 'opacity-50 pointer-events-none' : ''}`;
    card.innerHTML = `
      <h3 class="font-bold mb-2">${step}</h3>
      ${idx < steps.length - 1
        ? `<button class="unlock bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition">Mark as Done</button>`
        : `<button class="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition">Try Out Yourself</button>`
      }
    `;
    cardsDiv.appendChild(card);
  });

  const unlocks = document.querySelectorAll('.unlock');
  unlocks.forEach((btn, idx) => {
    btn.onclick = () => {
      btn.parentElement.classList.add('opacity-50', 'pointer-events-none');
      const next = cardsDiv.children[idx + 1];
      if (next) next.classList.remove('opacity-50', 'pointer-events-none');
      document.getElementById('progress').style.width = `${Math.round(((idx + 1) / steps.length) * 100)}%`;
    };
  });
}
