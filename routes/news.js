const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

router.get('/', async (req, res) => {
  const topic = req.query.q || 'india';

  if (!NEWS_API_KEY) {
    console.error("❌ API key missing in .env");
    return res.status(500).json({ error: "API key missing" });
  }

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&apiKey=${NEWS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      console.error("❌ NewsAPI responded with error:", data);
      return res.status(500).json({ error: "NewsAPI returned error", info: data });
    }

    res.json(data); // ✅ Success
  } catch (err) {
    console.error("❌ Error fetching news:", err.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

module.exports = router;
