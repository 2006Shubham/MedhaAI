require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { IncomingForm } = require('formidable');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅✅✅ Added: News Router ✅✅✅
const newsRouter = require('./routes/news');
app.use('/api/news', newsRouter);

// Upload + extract text
app.post('/upload-and-extract-text', async (req, res) => {
  const form = new IncomingForm({
    multiples: false,
    uploadDir: path.join(__dirname, 'temp_uploads'),
    keepExtensions: true,
  });

  await fs.mkdir(form.uploadDir, { recursive: true });

  form.parse(req, async (err, _, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed.' });
    const file = files.document && files.document[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = file.filepath;
    const ext = path.extname(file.originalFilename).toLowerCase();

    let text = '';
    try {
      if (ext === '.txt') {
        text = await fs.readFile(filePath, 'utf8');
      } else if (ext === '.pdf') {
        const pdfData = await pdf(await fs.readFile(filePath));
        text = pdfData.text;
      } else if (ext === '.doc' || ext === '.docx') {
        const doc = await mammoth.extractRawText({ path: filePath });
        text = doc.value;
      } else {
        return res.status(400).json({ error: 'Unsupported file type.' });
      }

      await fs.unlink(filePath);
      if (text.trim().length < 50) return res.status(400).json({ error: 'Text too short.' });

      res.json({ textContent: text });

    } catch (err) {
      await fs.unlink(filePath);
      res.status(500).json({ error: 'Processing failed.' });
    }
  });
});

// ✅ Generate MCQs
app.post('/generate-mcqs', async (req, res) => {
  const { documentText } = req.body;
  if (!documentText) return res.status(400).json({ error: 'Missing text.' });

  const prompt = `
    Create 5 MCQs:
    Each: {
      "question": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "A"
    }
    TEXT: ${documentText}
    Respond with pure JSON array only.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    if (text.startsWith('```json')) text = text.slice(7, -3).trim();
    if (text.startsWith('```')) text = text.slice(3, -3).trim();

    const mcqs = JSON.parse(text);
    if (!Array.isArray(mcqs)) throw new Error('Invalid MCQ JSON.');

    res.json(mcqs);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'MCQ generation failed: ' + err.message });
  }
});

// ✅ Generate Roadmap
app.post('/generate-roadmap', async (req, res) => {
  const { answers, textContent } = req.body;
  if (!answers || !textContent) {
    return res.status(400).json({ error: 'Missing roadmap input.' });
  }

  const prompt = `
    Based on answers: ${JSON.stringify(answers)},
    And text: ${textContent},
    Create 8 roadmap cards:
    Each: {
      "title": "...",
      "description": "...",
      "details": "...",
      "resources": ["link1", "link2"]
    }
    Respond with JSON array ONLY.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    if (text.startsWith('```json')) text = text.slice(7, -3).trim();
    if (text.startsWith('```')) text = text.slice(3, -3).trim();

    const roadmap = JSON.parse(text);
    if (!Array.isArray(roadmap)) throw new Error('Invalid roadmap JSON.');

    res.json({ roadmap });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Roadmap generation failed: ' + err.message });
  }
});

// ✅ Simple Gemini Chat endpoint
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt missing' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ reply: text });
  } catch (err) {
    console.error('Chatbot Gemini error:', err);
    res.status(500).json({ error: 'Gemini chatbot failed' });
  }
});

app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
