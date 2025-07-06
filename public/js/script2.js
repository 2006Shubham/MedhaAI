const generateBtn = document.getElementById('generateBtn');
const promptInput = document.getElementById('promptInput');
const resultOutput = document.getElementById('resultOutput');

// Send message to server
generateBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert('Please enter a prompt!');
    return;
  }

  // ✅ User bubble
  const userMsg = document.createElement('div');
  userMsg.className = 'message-bubble user-message';
  userMsg.innerText = prompt;
  resultOutput.appendChild(userMsg);

  promptInput.value = '';
  scrollToBottom();

  // ✅ Typing bubble
  const aiMsg = document.createElement('div');
  aiMsg.className = 'message-bubble ai-message loading-message';
  aiMsg.innerText = 'Gemini is typing...';
  resultOutput.appendChild(aiMsg);
  scrollToBottom();

  try {
    const res = await fetch('/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();
    console.log('[Gemini]', data);

    // ✅ FIXED: Use correct key 'reply'
    aiMsg.innerText = cleanMarkdown(data.reply || 'No response.');
    aiMsg.classList.remove('loading-message');
    scrollToBottom();
  } catch (err) {
    console.error('❌ Chatbot error:', err);
    aiMsg.innerText = '❌ ' + err.message;
    aiMsg.classList.remove('loading-message');
    aiMsg.classList.add('error-message');
    scrollToBottom();
  }
});

function scrollToBottom() {
  resultOutput.scrollTop = resultOutput.scrollHeight;
}

promptInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
  if (this.scrollHeight > 150) {
    this.style.overflowY = 'auto';
    this.style.height = '150px';
  } else {
    this.style.overflowY = 'hidden';
  }
});

// Grow on load
document.addEventListener('DOMContentLoaded', () => {
  promptInput.style.height = 'auto';
  promptInput.style.height = promptInput.scrollHeight + 'px';
});

// ✅ Simple Markdown cleaner
function cleanMarkdown(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/```/g, '')
    .trim();
}
