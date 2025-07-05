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
  console.error('❌ GEMINI_API_KEY not found. Check your .env!');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 1️⃣ Upload + extract
app.post('/upload-and-extract-text', async (req, res) => {
  const form = new IncomingForm({
    multiples: false,
    uploadDir: path.join(__dirname, 'temp_uploads'),
    keepExtensions: true
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
    } catch (e) {
      await fs.unlink(filePath);
      res.status(500).json({ error: 'Processing failed.' });
    }
  });
});

// ✅ 2️⃣ Generate MCQs (SAFE JSON)
app.post('/generate-mcqs', async (req, res) => {
  const { documentText } = req.body;
  if (!documentText) return res.status(400).json({ error: 'Missing text' });

  const prompt = `Create 5 MCQs from this text. Each MCQ must have:
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "A"
  }
  Text: ${documentText}
  Give only pure JSON array.`;

  try {
    const result = await genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }).generateContent(prompt);
    let raw = await result.response.text();

    // Clean markdown code fences if any
    if (raw.startsWith('```json')) raw = raw.slice(7, -3).trim();
    if (raw.startsWith('```')) raw = raw.slice(3, -3).trim();

    const mcqs = JSON.parse(raw);

    if (!Array.isArray(mcqs)) throw new Error('Invalid Gemini response');

    res.json(mcqs);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'MCQ generation failed: ' + err.message });
  }
});


// ✅ 3️⃣ Done — no roadmap, no extra confusion
// You can add /generate-roadmap again later if needed.

app.listen(port, () => console.log(`✅ Server running: http://localhost:${port}`));
