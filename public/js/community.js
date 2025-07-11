async function searchReddit() {
  const query = document.getElementById("questionInput").value.trim();
  const resultsDiv = document.getElementById("redditResults");
  resultsDiv.innerHTML = "";

  if (!query) {
    alert("Please enter a question.");
    return;
  }

  const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10&sort=relevance`;

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();
    const posts = data.data.children;

    if (posts.length === 0) {
      resultsDiv.innerHTML = "<p>No related questions found on Reddit.</p>";
      return;
    }

    posts.forEach(post => {
      const { title, selftext, permalink, ups } = post.data;
      const postId = permalink.split('/')[4];

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${title}</h3>
        <p>${selftext ? selftext.slice(0, 200) + "..." : "No preview available."}</p>
        <p><strong>Upvotes:</strong> ${ups}</p>
        <button class = "read-btn" onclick="loadFullPost('${permalink}', '${postId}')">Read Full Post</button>
        <div id="full-${postId}" class="full-post"></div>
      `;

      resultsDiv.appendChild(card);
    });

  } catch (error) {
    console.error("Error fetching Reddit data:", error);
    resultsDiv.innerHTML = "<p>Something went wrong. Try again later.</p>";
  }
}

async function loadFullPost(permalink, postId) {
  const container = document.getElementById(`full-${postId}`);
  container.innerHTML = "<p style='color:gray;'>Loading full post and comments...</p>";

  try {
    const res = await fetch(`https://www.reddit.com${permalink}.json`);
    const data = await res.json();

    const post = data[0].data.children[0].data;
    const comments = data[1].data.children;

    let html = `
      <p><strong>Full Post:</strong></p>
      <p>${post.selftext || 'No full text available.'}</p>
      <hr>
      <h4>Top Comments:</h4>
    `;

    let count = 0;
    for (let c of comments) {
      if (c.kind !== "t1") continue;
      const comment = c.data;
      html += `<p><strong>${comment.author}</strong>: ${comment.body.slice(0, 400)}</p>`;
      count++;
      if (count >= 5) break;
    }

    if (count === 0) {
      html += `<p>No comments found.</p>`;
    }

    container.innerHTML = html;
  } catch (err) {
    console.error("Failed to load post:", err);
    container.innerHTML = "<p style='color:red;'>Could not load full post.</p>";
  }
}
