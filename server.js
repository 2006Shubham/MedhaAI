require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const fs = require('fs').promises; // Use promise-based fs for async operations
const path = require('path');
const { IncomingForm } = require('formidable'); // Correct import for formidable v3+
const pdf = require('pdf-parse'); // For PDF parsing
const mammoth = require('mammoth'); // For .docx parsing
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default

// Configure Google Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('Error: GEMINI_API_KEY not found in .env file.');
    console.error('Please make sure you have created a .env file with GEMINI_API_KEY=YOUR_API_KEY_HERE');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to upload document and extract text
app.post('/upload-and-extract-text', async (req, res) => {
    // Create a new instance of IncomingForm for formidable
    const form = new IncomingForm({
        multiples: false, // Expecting a single file
        uploadDir: path.join(__dirname, 'temp_uploads'), // Temporary directory for uploads
        keepExtensions: true // Keep original file extensions
    });

    // Ensure the temp_uploads directory exists
    const tempUploadsDir = path.join(__dirname, 'temp_uploads');
    try {
        await fs.mkdir(tempUploadsDir, { recursive: true }); // Use fs.promises.mkdir for async
    } catch (err) {
        if (err.code !== 'EEXIST') { // Ignore error if directory already exists
            console.error('Error creating temp_uploads directory:', err);
            return res.status(500).json({ error: 'Server error creating upload directory.' });
        }
    }

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form data:', err);
            return res.status(500).json({ error: 'Error processing file upload.' });
        }

        // formidable v3+ returns files as an object of arrays, so access the first element
        const uploadedFile = files.document && files.document[0];
        if (!uploadedFile) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const filePath = uploadedFile.filepath; // Formidable provides the path to the temporary file
        const originalname = uploadedFile.originalFilename;
        const ext = path.extname(originalname).toLowerCase();
        let textContent = '';

        try {
            if (ext === '.txt') {
                textContent = await fs.readFile(filePath, 'utf8'); // Use fs.promises.readFile
            } else if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(filePath); // Use fs.promises.readFile
                const data = await pdf(dataBuffer);
                textContent = data.text;
            } else if (ext === '.doc' || ext === '.docx') {
                // mammoth is primarily for .docx. For .doc, it might struggle or need additional tools.
                // If .doc support is crucial and mammoth fails, consider using 'textract' with its system dependencies.
                const result = await mammoth.extractRawText({ path: filePath });
                textContent = result.value; // The raw text
            } else {
                return res.status(400).json({ error: 'Unsupported file type. Please upload .txt, .pdf, .doc, or .docx.' });
            }

            // Clean up the uploaded file
            await fs.unlink(filePath); // Use fs.promises.unlink

            // Basic check for minimal content to avoid empty prompts to Gemini
            if (textContent.trim().length < 50) {
                return res.status(400).json({ error: 'Extracted text is too short or empty. Please ensure the document contains sufficient content.' });
            }

            res.json({ textContent });

        } catch (error) {
            console.error('Error processing document:', error);
            // Clean up the uploaded file even if processing fails
            // fs.existsSync is synchronous, so it's fine here before await unlink
            if (fs.existsSync(filePath)) {
                await fs.unlink(filePath);
            }
            res.status(500).json({ error: 'Failed to process document: ' + error.message });
        }
    });
});

// Endpoint to generate MCQs using Gemini
app.post('/generate-mcqs', async (req, res) => {
    const { documentText } = req.body; // No longer expecting numMcqs from frontend

    if (!documentText) {
        return res.status(400).json({ error: 'No document text provided for MCQ generation.' });
    }
    
    // Using a reliable Gemini model. Consider "gemini-1.5-pro" for higher quality but potentially higher cost/latency.
    const quizModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 

    // Craft the prompt for Gemini - IMPORTANT: Let Gemini decide the quantity.
    const prompt = `Based on the following text, generate a multiple-choice quiz.
    Each question must have 4 options (A, B, C, D) and specify the correct answer using the option letter (e.g., "A", "B", "C", "D").
    The number of questions should be reasonable given the length and complexity of the text.
    Provide the output as a JSON array of objects.

    Example JSON structure:
    [
      {
        "question": "What is the capital of France?",
        "options": {
          "A": "Berlin",
          "B": "Madrid",
          "C": "Paris",
          "D": "Rome"
        },
        "correct_answer": "C"
      },
      {
        "question": "Which animal lays eggs and has a pouch?",
        "options": {
            "A": "Kangaroo",
            "B": "Platypus",
            "C": "Elephant",
            "D": "Dolphin"
        },
        "correct_answer": "B"
      }
    ]

    Text:
    ---
    ${documentText}
    ---
    `;

    try {
        console.log('Sending prompt to Gemini...');
        const result = await quizModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        console.log('Gemini raw response (first 500 chars):', text.substring(0, 500) + '...');

        // Attempt to extract JSON from markdown code block
        let jsonString = text.trim();
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
        } else if (jsonString.startsWith('```') && jsonString.includes('{')) { 
             // More robust extraction: find first '{' and last '}' to get valid JSON
             const firstBrace = jsonString.indexOf('{');
             const lastBrace = jsonString.lastIndexOf('}');
             if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                 jsonString = jsonString.substring(firstBrace, lastBrace + 1).trim();
             } else {
                 throw new Error("Could not find valid JSON structure within Gemini's response.");
             }
        }
        
        const mcqs = JSON.parse(jsonString);

        // Basic validation for the structure of MCQs
        if (!Array.isArray(mcqs) || mcqs.length === 0 || !mcqs[0].question || typeof mcqs[0].options !== 'object' || !mcqs[0].options.A || !mcqs[0].correct_answer) {
             console.error("Gemini returned an invalid or empty quiz format. Raw text:", text);
             throw new Error("Gemini returned an invalid or empty quiz format. Please try again or refine your input.");
        }
        
        res.json(mcqs); // Send whatever valid MCQs Gemini provided

    } catch (error) {
        console.error('Error generating MCQs with Gemini:', error);
        // Provide more helpful error messages to the frontend
        let errorMessage = 'Failed to generate quiz. An unexpected server error occurred.';
        if (error.message) {
            errorMessage = error.message; 
        }
        if (error.response && error.response.status) {
            errorMessage = `Gemini API Error (${error.response.status}): ${error.response.statusText || 'Unknown API Error'}. Please check your API key and try again.`;
        }
        res.status(500).json({ error: errorMessage });
    }
});



app.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body; // Get the prompt from the frontend request body

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        // Choose the model (e.g., "gemini-pro" for text, "gemini-1.5-flash" for speed)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        // Generate content using the Gemini model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Extract the generated text

        // Send the generated text back to the frontend
        res.json({ generatedText: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Provide a more user-friendly error message to the frontend
        res.status(500).json({ error: 'Failed to generate text. Please try again or check server logs.' });
    }
});



// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Open your browser and navigate to: http://localhost:${port}`);
    console.log(`Make sure your HTML, CSS, and JS files are in a 'public' directory.`);
});