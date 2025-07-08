// Get DOM elements
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");

// Append message bubble
function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex items-start space-x-3 ${sender === "user" ? "justify-end" : "justify-start"}`;

  const avatar = document.createElement("div");
  avatar.className = "w-8 h-8 rounded-full flex items-center justify-center bg-purple-600 text-white font-bold flex-shrink-0";
  avatar.innerText = sender === "user" ? "U" : "A";

  const bubble = document.createElement("div");
  bubble.className = `message max-w-[75%] px-4 py-2 rounded-2xl ${
    sender === "user"
      ? "bg-purple-600 text-white rounded-br-none"
      : "bg-gray-200 text-gray-800 rounded-bl-none"
  }`;
  bubble.innerText = text;

  if (sender === "user") {
    wrapper.appendChild(bubble);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
  }

  chatbox.appendChild(wrapper);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Show typing indicator
function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.id = "typing-indicator";
  wrapper.className = "flex items-start space-x-3 justify-start";

  const avatar = document.createElement("div");
  avatar.className = "w-8 h-8 rounded-full flex items-center justify-center bg-purple-600 text-white font-bold flex-shrink-0";
  avatar.innerText = "A";

  const typing = document.createElement("div");
  typing.className = "typing flex space-x-1";
  typing.innerHTML = "<span></span><span></span><span></span>";

  wrapper.appendChild(avatar);
  wrapper.appendChild(typing);

  chatbox.appendChild(wrapper);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Remove typing indicator
function removeTyping() {
  const typing = document.getElementById("typing-indicator");
  if (typing) typing.remove();
}

// Handle sending message
async function sendMessage() {
  const prompt = userInput.value.trim();
  if (!prompt) return;

  appendMessage(prompt, "user");
  userInput.value = "";
  showTyping();

  try {
    const response = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    removeTyping();

    if (data.reply) {
      const plainText = cleanMarkdown(data.reply);
      appendMessage(plainText, "bot");
    } else {
      appendMessage("❌ Sorry, I couldn't generate a response.", "bot");
    }
  } catch (err) {
    console.error("Error fetching Gemini response:", err);
    removeTyping();
    appendMessage("❌ Failed to reach server. Try again.", "bot");
  }
}

// Send on Enter key
userInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Clean markdown symbols
function cleanMarkdown(md) {
  let text = md;
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*(.*?)\*\*/gs, '$1');
  text = text.replace(/\*(.*?)\*/gs, '$1');
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '');
  text = text.replace(/^\s*([-*+])\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/\n{2,}/g, '\n');
  return text.trim();
}

// Optional: mobile toggle (if you use it)
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}
// Example:
const output = document.getElementById('resultOutput');

// User message:
const user = document.createElement('div');
user.className = 'message user';
user.innerHTML = `<div class="bubble">Hello there</div><div class="avatar user">U</div>`;
output.appendChild(user);

// AI message:
const ai = document.createElement('div');
ai.className = 'message ai';
ai.innerHTML = `<div class="avatar">A</div><div class="bubble">Hi! How can I help?</div>`;
output.appendChild(ai);

