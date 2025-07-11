// routes/news.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // Correctly import node-fetch

// News API endpoint
router.get('/', async (req, res) => {
  const NEWS_API_KEY = process.env.NEWS_API_KEY; // Get API key from environment variables
  const NEWS_URL = `https://newsapi.org/v2/everything?q=india&language=en&apiKey=${NEWS_API_KEY}`;

  if (!NEWS_API_KEY) {
    return res.status(500).json({ error: 'News API key not configured on the server.' });
  }

  try {
    const response = await fetch(NEWS_URL); // Use the imported fetch
    if (!response.ok) {
        throw new Error(`News API returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching news from external API:", error);
    res.status(500).json({ error: 'Failed to fetch news from external API.' });
  }
});

module.exports = router;