const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/', async (req, res) => {
  const { q, target } = req.body;

  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q,
        source: 'en',
        target,
        format: 'text'
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
