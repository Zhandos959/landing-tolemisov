const OPEN_LIBRARY_BASE = "https://openlibrary.org";

const searchForm = document.querySelector("#library-search-form");
const searchInput = document.querySelector("#library-query");
const resultsContainer = document.querySelector("#library-results");
const searchStatus = document.querySelector("#library-status");
const picksStatus = document.querySelector("#picks-status");
const bookDialog = document.querySelector("#book-dialog");
const bookDetails = document.querySelector("#book-details");

function showStatus(element, message, kind = "") {
  element.textContent = message;
  element.className = `library-status ${kind}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`);
  }
  return response.json();
}

function makeBookCard(book, index) {
  const article = document.createElement("article");
  article.className = "library-card";

  const cover = document.createElement("div");
  cover.className = "library-cover";
  if (book.cover_i) {
    const image = document.createElement("img");
    image.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
    image.alt = `Обложка книги «${book.title}»`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.remove();
      cover.classList.add("cover-placeholder");
      cover.textContent = "NEXUS / ARCHIVE";
    }, { once: true });
    cover.append(image);
  } else {
    cover.classList.add("cover-placeholder");
    cover.textContent = "NEXUS / ARCHIVE";
  }

  const content = document.createElement("div");
  content.className = "library-card-content";
  const indexLabel = document.createElement("span");
  indexLabel.className = "library-card-index";
  indexLabel.textContent = `ARCHIVE ITEM ${String(index + 1).padStart(2, "0")}`;
  const title = document.createElement("h3");
  title.textContent = book.title || "Без названия";
  const author = document.createElement("p");
  author.className = "library-author";
  author.textContent = (book.author_name || ["Автор не указан"]).slice(0, 2).join(", ");
  const year = document.createElement("p");
  year.className = "library-year";
  year.textContent = book.first_publish_year ? `Первое издание · ${book.first_publish_year}` : "Год издания не указан";
  const detailsButton = document.createElement("button");
  detailsButton.className = "library-details-button";
  detailsButton.type = "button";
  detailsButton.textContent = "Подробнее ↗";
  detailsButton.addEventListener("click", () => loadBookDetails(book.key));

  content.append(indexLabel, title, author, year, detailsButton);
  article.append(cover, content);
  return article;
}

async function searchBooks(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    showStatus(searchStatus, "Введите тему или название для поиска.", "error");
    return;
  }

  resultsContainer.replaceChildren();
  showStatus(searchStatus, "Ищем в архиве…", "loading");
  const url = `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(trimmedQuery)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`;

  try {
    const results = await fetchJson(url);
    if (!results.docs.length) {
      showStatus(searchStatus, "По этому запросу ничего не найдено. Попробуйте изменить формулировку.", "error");
      return;
    }
    resultsContainer.replaceChildren(...results.docs.map(makeBookCard));
    showStatus(searchStatus, `Найдено ${results.numFound.toLocaleString("ru-RU")} книг · показаны первые ${results.docs.length}.`, "success");
  } catch (error) {
    showStatus(searchStatus, `Не удалось загрузить результаты. ${error.message} Проверьте подключение к интернету.`, "error");
  }
}

async function loadBookDetails(workKey) {
  bookDetails.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Загружаем подробности…";
  bookDetails.append(loading);
  bookDialog.showModal();

  try {
    const work = await fetchJson(`${OPEN_LIBRARY_BASE}${workKey}.json`);
    bookDetails.replaceChildren();
    const title = document.createElement("h2");
    title.id = "book-dialog-title";
    title.textContent = work.title || "Без названия";
    const description = document.createElement("p");
    description.className = "book-description";
    const descriptionText = typeof work.description === "string" ? work.description : work.description?.value;
    description.textContent = descriptionText || "Open Library не предоставила описание для этого произведения.";
    const link = document.createElement("a");
    link.className = "book-source-link";
    link.href = `${OPEN_LIBRARY_BASE}${workKey}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Открыть страницу произведения ↗";
    bookDetails.append(title, description, link);
  } catch (error) {
    bookDetails.replaceChildren();
    const message = document.createElement("p");
    message.className = "library-status error";
    message.textContent = `Не удалось загрузить подробности. ${error.message}`;
    bookDetails.append(message);
  }
}

function makePickItem(book) {
  const item = document.createElement("article");
  item.className = "pick-item";
  const title = document.createElement("span");
  title.textContent = book.title || "Без названия";
  const author = document.createElement("small");
  author.textContent = (book.author_name || ["Автор не указан"])[0];
  item.append(title, author);
  return item;
}

async function loadClubPicks() {
  showStatus(picksStatus, "Загружаем обе подборки…", "loading");
  const designUrl = `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent("subject:game design")}&limit=4&fields=key,title,author_name`;
  const gamesUrl = `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent("subject:video games")}&limit=4&fields=key,title,author_name`;

  try {
    const [designResults, gamesResults] = await Promise.all([
      fetchJson(designUrl),
      fetchJson(gamesUrl)
    ]);
    document.querySelector("#design-picks").replaceChildren(...designResults.docs.slice(0, 4).map(makePickItem));
    document.querySelector("#games-picks").replaceChildren(...gamesResults.docs.slice(0, 4).map(makePickItem));
    showStatus(picksStatus, "Обе подборки загружены параллельно.", "success");
  } catch (error) {
    showStatus(picksStatus, `Не удалось загрузить подборки. ${error.message} Проверьте подключение к интернету.`, "error");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchBooks(searchInput.value);
});

document.querySelector("#dialog-close").addEventListener("click", () => bookDialog.close());
bookDialog.addEventListener("click", (event) => {
  if (event.target === bookDialog) bookDialog.close();
});

searchBooks(searchInput.value);
loadClubPicks();
