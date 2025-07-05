// This file remains the same as in the previous perfect solution

document.getElementById('generateBtn').addEventListener('click', async () => {
    const promptInput = document.getElementById('promptInput');
    const resultOutput = document.getElementById('resultOutput');
    const prompt = promptInput.value.trim();

    if (prompt === '') {
        alert('Please enter a prompt!');
        return;
    }

    // 1. Create and append the user's message bubble
    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('message-bubble', 'user-message');
    userMessageDiv.textContent = prompt;
    resultOutput.appendChild(userMessageDiv);

    // 2. Clear the input immediately after sending
    promptInput.value = '';

    // 3. Scroll to the bottom to show the new message
    scrollToBottom();

    // 4. Create a placeholder for the AI response
    const aiResponseDiv = document.createElement('div');
    aiResponseDiv.classList.add('message-bubble', 'ai-message', 'loading-message');
    aiResponseDiv.textContent = 'Gemini is typing...';
    resultOutput.appendChild(aiResponseDiv);
    scrollToBottom();

    try {
        const response = await fetch('/generate-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error occurred.');
        }

        const data = await response.json();
        console.log(data);

        // Update the AI response placeholder with actual text
        aiResponseDiv.textContent = data.generatedText;
        aiResponseDiv.classList.remove('loading-message');
        scrollToBottom();

    } catch (error) {
        console.error('Error fetching Gemini response:', error);
        aiResponseDiv.textContent = `Error: ${error.message}`;
        aiResponseDiv.classList.remove('loading-message');
        aiResponseDiv.classList.add('error-message');
        scrollToBottom();
    }
});

function scrollToBottom() {
    const resultOutput = document.getElementById('resultOutput');
    resultOutput.scrollTop = resultOutput.scrollHeight;
}

document.getElementById('promptInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.scrollHeight > 150) { // Increased max height slightly for textarea
        this.style.overflowY = 'auto';
        this.style.height = '150px';
    } else {
        this.style.overflowY = 'hidden';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    promptInput.style.height = 'auto';
    promptInput.style.height = (promptInput.scrollHeight) + 'px';
});