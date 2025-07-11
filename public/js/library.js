async function searchBooks() {
  const topic = document.getElementById("topicInput").value.trim();
  const resultsDiv = document.getElementById("bookResults");
  resultsDiv.innerHTML = "";

  if (!topic) {
    alert("Please enter a topic.");
    return;
  }

  const query = encodeURIComponent(topic);
  const searchUrl = `https://openlibrary.org/search.json?q=${query}&limit=40`; // Higher limit to extract unique books

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();
    const books = data.docs;

    if (books.length === 0) {
      resultsDiv.innerHTML = "<p>No books found for this topic.</p>";
      return;
    }

    const seen = new Set();
    let uniqueBooks = [];

    for (let book of books) {
      const rawTitle = book.title || "Untitled";
      const rawAuthor = book.author_name ? book.author_name[0] : "Unknown Author";

      // Normalize for comparison
      const title = rawTitle.trim().toLowerCase();
      const author = rawAuthor.trim().toLowerCase();
      const uniqueKey = `${title}::${author}`;

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        uniqueBooks.push({
          title: rawTitle,
          author: rawAuthor,
          workKey: book.key,
          editionKey: book.edition_key ? book.edition_key[0] : null,
          ia: book.ia ? book.ia[0] : null
        });
      }

      if (uniqueBooks.length >= 5) break; // Show only 5 unique books
    }

    for (let book of uniqueBooks) {
      let description = "No summary available.";
      let readLink = null;

      // Fetch description from work key
      try {
        const workRes = await fetch(`https://openlibrary.org${book.workKey}.json`);
        const workData = await workRes.json();
        if (workData.description) {
          description = typeof workData.description === 'string'
            ? workData.description
            : workData.description.value;
        }
      } catch (err) {
        // Ignore if no description
      }

      // Determine read/download link
      if (book.ia) {
        readLink = {
          url: `https://archive.org/details/${book.ia}`,
          type: "Read/Download"
        };
      } else if (book.editionKey) {
        readLink = {
          url: `https://openlibrary.org/books/${book.editionKey}`,
          type: "Read in Browser"
        };
      }

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${book.title}</h3>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Summary:</strong> ${description.slice(0, 300)}...</p>
        ${readLink ? `<a href="${readLink.url}" target="_blank" style="color:lightgreen;">${readLink.type}</a>` : `<p style="color:gray;">No digital access available</p>`}
      `;

      resultsDiv.appendChild(card);
    }

  } catch (error) {
    console.error("Error fetching books:", error);
    resultsDiv.innerHTML = "<p>Error fetching book data. Please try again later.</p>";
  }
}
