// public/app.js
// Removed API_KEY directly from here
const NEWS_URL_PROXY = '/api/news'; // Endpoint on your Node.js server

window.onload = () => {
  fetch(NEWS_URL_PROXY) // Call your server's proxy
    .then(res => res.json())
    .then(data => {
      if (data.articles && data.articles.length > 0) { // Check for data.articles
        displayNews(data.articles);
      } else {
        document.getElementById('news-container').innerText = data.error || 'No news found.'; // Handle server errors
      }
    })
    .catch(err => {
      console.error("Error fetching news:", err);
      document.getElementById('news-container').innerText = 'Error loading news.';
    });
};

function displayNews(articles) {
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  articles.forEach(article => {
    const div = document.createElement('div');
    div.className = 'news-card';

    div.innerHTML = `
      <h3>${article.title}</h3>
      ${article.urlToImage ? `<img src="${article.urlToImage}" alt="news image">` : ''}

      <p>${article.description || 'No description available.'}</p>

       <p>${article.content || 'No content available.'}</p>

      <p><strong>Published:</strong> ${new Date(article.publishedAt).toLocaleString()}</p>
      <button class="read-btn" onclick="readText(\`${sanitize(article.title + '. ' + article.description+'. ' + article.content +".  for more information visit to link given below ")}\`)">🔊 Read</button>
      <a href="${article.url}" target="_blank">📰 Read Full Article</a>
    `;

    container.appendChild(div);
  });
}

function readText(text) {
  speechSynthesis.cancel(); // Stop any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN';
  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

// Optional: sanitize to prevent issues with quotes in HTML attributes
function sanitize(str) {
  return str.replace(/[`~"'\\]/g, '');
}