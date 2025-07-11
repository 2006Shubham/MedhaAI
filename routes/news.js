const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

router.get('/', async (req, res) => {
  // ✅ Default: India national headlines
  const country = 'in';
  const topic = req.query.q; // Optional: can use q for category if needed

  if (!NEWS_API_KEY) {
    console.error("❌ API key missing in .env");
    return res.status(500).json({ error: "API key missing" });
  }

  // ✅ Proper `top-headlines` URL
  const url = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${NEWS_API_KEY}`;

  console.log("✅ Final URL:", url);

  try {
    const response = await fetch(url);
    console.log("🔍 Fetch response status:", response.status);

    const data = await response.json();
    console.log("✅ NewsAPI raw response:", data);

    if (data.status !== 'ok') {
      console.error("❌ NewsAPI responded with error:", data);
      return res.status(500).json({ error: "NewsAPI returned error", info: data });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching news:", err.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

module.exports = router;
