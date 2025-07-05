const NEWS_URL = '/api/news?q=india'; // Backend se aa raha, API key hidden

window.onload = () => {
  fetch(NEWS_URL)
    .then(res => res.json())
    .then(data => {
      if (data.articles && data.articles.length > 0) {
        displayNews(data.articles);
      } else {
        document.getElementById('news-container').innerText = 'No news found.';
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
      <button class="read-btn" onclick="readText(\`${sanitize(article.title + '. ' + article.description + '. ' + article.content + '. For more information, visit the link below.')}\`)">🔊 Read</button>
      <a href="${article.url}" target="_blank">📰 Read Full Article</a>
    `;

    container.appendChild(div);
  });
}

let currentUtterance = null;
let isSpeaking = false;

function readText(text) {
  // If already speaking something
  if (isSpeaking && currentUtterance && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    return;
  }

  // If not speaking, start reading
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = 'en-IN';
  currentUtterance.rate = 1;
  currentUtterance.pitch = 1;

  currentUtterance.onstart = () => {
    isSpeaking = true;
  };

  currentUtterance.onend = () => {
    isSpeaking = false;
  };

  speechSynthesis.speak(currentUtterance);
}


function toggleRead(button, text) {
  if (isSpeaking) {
    speechSynthesis.cancel();
    button.innerText = "🔊 Read";
    isSpeaking = false;
  } else {
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-IN';
    currentUtterance.rate = 1;
    currentUtterance.pitch = 1;

    currentUtterance.onstart = () => {
      isSpeaking = true;
      button.innerText = "⏹ Stop";
    };

    currentUtterance.onend = () => {
      isSpeaking = false;
      button.innerText = "🔊 Read";
    };

    speechSynthesis.speak(currentUtterance);
  }
}



function sanitize(str) {
  return str.replace(/[`~"'\\]/g, '');
}
