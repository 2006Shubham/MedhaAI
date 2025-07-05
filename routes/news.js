const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

router.get('/', async (req, res) => {
  const topic = req.query.q || 'india';
//   const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&apiKey=${NEWS_API_KEY}`;

 const url = `https://newsapi.org/v2/everything?q=india&language=en&apiKey=${NEWS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

module.exports = router;
