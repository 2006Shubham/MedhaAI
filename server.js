require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Basic chatbot (optional)
app.post('/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    res.json({ response: text });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ error: 'Gemini failed' });
  }
});

// ✅ FINAL MCQ endpoint with double parse fallback
app.post('/generate-mcq', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const prompt = `
      Generate exactly 5 beginner multiple-choice questions for "${topic}".
      Format strictly:
      [
        {"q":"Question","a":["Option1","Option2","Option3"],"correct":1},
        ...
      ]
      No explanation, no extra text, no markdown — only raw JSON array.
    `;

    const result = await model.generateContent(prompt);
    let raw = await result.response.text();

    console.log('\n💡 RAW Gemini output:\n', raw);

    // Clean typical junk
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Try direct parse
    let mcqs;
    try {
      mcqs = JSON.parse(raw);
    } catch {
      // Try slicing by bracket
      const start = raw.indexOf('[');
      const end = raw.lastIndexOf(']');
      if (start === -1 || end === -1) throw new Error('No valid [ ] block found.');
      const cleanJson = raw.substring(start, end + 1);
      mcqs = JSON.parse(cleanJson);
    }

    if (!Array.isArray(mcqs) || mcqs.length < 1) {
      throw new Error('Parsed MCQ array invalid.');
    }

    res.json({ mcqs });

  } catch (err) {
    console.error('❌ MCQ error:', err);
    // ✅ Fallback
    const fallback = [
      { q: "What is HTML?", a: ["Programming", "Markup", "Language"], correct: 1 },
      { q: "CSS stands for?", a: ["Cascading", "Central", "Creative"], correct: 0 },
      { q: "JS is?", a: ["Compiled", "Interpreted", "None"], correct: 1 },
      { q: "API means?", a: ["Application", "Apple", "Apply"], correct: 0 },
      { q: "HTTP full form?", a: ["Hyper Text", "High Tech", "Hyper Transfer"], correct: 0 }
    ];
    res.json({ mcqs: fallback });
  }
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'roadmap.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running → http://localhost:${port}`);
});
