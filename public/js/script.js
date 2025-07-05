document.addEventListener('DOMContentLoaded', () => {
    const documentUpload = document.getElementById('documentUpload');
    const generateMcqsBtn = document.getElementById('generateMcqsBtn');
    const messageDisplay = document.getElementById('message');
    const uploadSection = document.getElementById('uploadSection');

    const mcqSection = document.getElementById('mcqSection');
    const mcqContainer = document.getElementById('mcqContainer');
    const submitMcqsBtn = document.getElementById('submitMcqsBtn');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const resetBtn = document.getElementById('resetBtn');

    let currentMcqs = []; // Store the generated MCQs
    let extractedDocumentText = ''; // Store the extracted text temporarily

    // --- Utility Functions ---
    function showMessage(msg, type = 'info') {
        messageDisplay.textContent = msg;
        messageDisplay.className = `info ${type}`; // Reset classes and add new type
        messageDisplay.style.display = 'block';
    }

    function hideMessage() {
        messageDisplay.textContent = '';
        messageDisplay.className = 'info';
        messageDisplay.style.display = 'none';
    }

    function showSection(sectionId) {
        uploadSection.style.display = 'none';
        mcqSection.style.display = 'none';
        document.getElementById(sectionId).style.display = 'block';
    }

    // --- Event Listeners ---

    generateMcqsBtn.addEventListener('click', async () => {
        const file = documentUpload.files[0];

        if (!file) {
            showMessage('Please select a file to upload.', 'error');
            return;
        }

        showMessage('Uploading file and extracting text...', 'info');
        generateMcqsBtn.disabled = true;

        const formData = new FormData();
        formData.append('document', file); // 'document' must match the field name in server.js formidable config

        try {
            // Step 1: Upload and Extract Text
            const uploadResponse = await fetch('/upload-and-extract-text', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json(); // Server will send JSON error
                throw new Error(errorData.error || 'Failed to extract text from file.');
            }

            const uploadResult = await uploadResponse.json();
            extractedDocumentText = uploadResult.textContent;
            
            showMessage('Text extracted successfully. Generating MCQs with Gemini...', 'info');

            // Step 2: Generate MCQs using the extracted text (no numMcqs needed)
            const mcqResponse = await fetch('/generate-mcqs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Tell server we're sending JSON
                },
                body: JSON.stringify({ documentText: extractedDocumentText }) // Send extracted text
            });

            if (!mcqResponse.ok) {
                const errorData = await mcqResponse.json(); // Server will send JSON error
                throw new Error(errorData.error || 'Failed to generate MCQs.');
            }

            const mcqData = await mcqResponse.json();
            currentMcqs = mcqData; // Store the generated MCQs
            displayMcqs(currentMcqs); // Display them to the user
            showSection('mcqSection'); // Show the quiz section
            hideMessage(); // Clear any previous status message
            
        } catch (error) {
            console.error('Error in MCQ generation workflow:', error);
            // Display error to user
            showMessage(`Error: ${error.message}`, 'error');
        } finally {
            // Re-enable buttons regardless of success or failure
            generateMcqsBtn.disabled = false;
            documentUpload.disabled = false;
        }
    });

    submitMcqsBtn.addEventListener('click', () => {
        let score = 0;
        const totalMcqs = currentMcqs.length;

        currentMcqs.forEach((mcq, index) => {
            const mcqElement = document.getElementById(`mcq-${index}`);
            const selectedOptionInput = mcqElement.querySelector(`input[name="mcq-${index}"]:checked`);
            
            // Get all option labels for this MCQ to highlight
            const optionLabels = mcqElement.querySelectorAll('.option-label');

            // Reset any previous highlights (useful if user submits multiple times)
            optionLabels.forEach(label => {
                label.classList.remove('correct', 'incorrect');
            });

            if (selectedOptionInput) {
                const userAnswer = selectedOptionInput.value; // e.g., "A", "B", "C", "D"
                const correctAnswer = mcq.correct_answer; // e.g., "C"

                if (userAnswer === correctAnswer) {
                    score++;
                    // Highlight selected option in green
                    selectedOptionInput.closest('.option-label').classList.add('correct');
                } else {
                    // Highlight selected option in red
                    selectedOptionInput.closest('.option-label').classList.add('incorrect');
                    // Find and highlight the correct option in green
                    optionLabels.forEach(label => {
                        const input = label.querySelector('input');
                        if (input && input.value === correctAnswer) {
                            label.classList.add('correct');
                        }
                    });
                }
            } else {
                // If no option was selected, just highlight the correct one in green
                optionLabels.forEach(label => {
                    const input = label.querySelector('input');
                    if (input && input.value === mcq.correct_answer) {
                        label.classList.add('correct');
                    }
                });
            }

            // Disable radio buttons after submission
            mcqElement.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.disabled = true;
            });
        });

        // scoreDisplay.textContent = `You scored: ${score} out of ${totalMcqs}!`;
        submitMcqsBtn.disabled = true; // Disable submit after showing score
        resetBtn.style.display = 'block'; // Show reset button
    });

    resetBtn.addEventListener('click', () => {
        // Reset UI to initial state
        documentUpload.value = ''; // Clear selected file
        currentMcqs = []; // Clear stored MCQs
        extractedDocumentText = ''; // Clear extracted text
        mcqContainer.innerHTML = ''; // Clear MCQs displayed in UI
        scoreDisplay.textContent = ''; // Clear score
        hideMessage(); // Hide any status messages
        submitMcqsBtn.disabled = false; // Re-enable submit button
        resetBtn.style.display = 'none'; // Hide reset button
        showSection('uploadSection'); // Go back to upload section
    });

    // --- Display MCQs Function ---
    function displayMcqs(mcqs) {
        mcqContainer.innerHTML = ''; // Clear previous MCQs
        if (mcqs.length === 0) {
            mcqContainer.innerHTML = '<p>No MCQs generated. Please try again with different content or a different document.</p>';
            return;
        }

        mcqs.forEach((mcq, index) => {
            const mcqItem = document.createElement('div');
            mcqItem.classList.add('mcq-item');
            mcqItem.id = `mcq-${index}`;

            const questionElem = document.createElement('p');
            questionElem.classList.add('question');
            questionElem.textContent = `${index + 1}. ${mcq.question}`;
            mcqItem.appendChild(questionElem);

            const optionsGrid = document.createElement('div');
            optionsGrid.classList.add('options-grid');

            // Ensure options are iterated in a consistent order (A, B, C, D)
            const optionKeys = ['A', 'B', 'C', 'D'];
            optionKeys.forEach(key => {
                // Check if the options object and the specific key (A, B, C, D) exist in the MCQ
                if (mcq.options && typeof mcq.options === 'object' && mcq.options[key]) {
                    const optionLabel = document.createElement('label');
                    optionLabel.classList.add('option-label');
                    
                    const radioInput = document.createElement('input');
                    radioInput.type = 'radio';
                    radioInput.name = `mcq-${index}`; // Group radio buttons for this question
                    radioInput.value = key; // Value is the option letter (A, B, C, D)
                    
                    const optionText = document.createElement('span');
                    optionText.textContent = `${key}. ${mcq.options[key]}`;

                    optionLabel.appendChild(radioInput);
                    optionLabel.appendChild(optionText);
                    optionsGrid.appendChild(optionLabel);
                }
            });

            mcqItem.appendChild(optionsGrid);
            mcqContainer.appendChild(mcqItem);
        });
    }

    // Initial state setup when the page loads
    showSection('uploadSection');
    hideMessage();
});