const TMDB_API_KEY = "47b972fb486f4c35b33845e1a39359e0";
const RD_API_KEY = "45COHUVTBKMQVASD5DGCO7FHUWL6FGRJKZBTUONAWO2C56NNQK3A";
const baseImageUrl = "https://image.tmdb.org/t/p/w500";

document.addEventListener("DOMContentLoaded", () => {
  fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => showMovies(data.results));
});

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");
}

function showMovies(movies) {
  const container = document.getElementById("movie-list");
  container.innerHTML = "";
  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img src="${baseImageUrl + movie.poster_path}" alt="${movie.title}" />
      <h3>${movie.title}</h3>
    `;
    card.onclick = () => loadDetails(movie.id);
    container.appendChild(card);
  });
}

function loadDetails(id) {
  fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(movie => {
      const section = document.getElementById("movie-details");
      section.innerHTML = `
        <h2>${movie.title}</h2>
        <p>${movie.overview}</p>
        <button onclick="searchTorrents('${movie.title} ${movie.release_date?.slice(0,4) || ''}')">🔍 بحث عن تورنت</button>
        <div id="torrent-results"></div>
      `;
      showSection("movie-details");
    });
}

async function searchTorrents(query) {
  const resultsDiv = document.getElementById("torrent-results");
  resultsDiv.innerHTML = "⏳ جاري البحث...";
  try {
    const res = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.data.movies && data.data.movies.length > 0) {
      let html = "<h3>الروابط المتاحة:</h3>";
      data.data.movies[0].torrents.forEach(t => {
        html += `
          <div class="torrent">
            <p>الجودة: ${t.quality} | الحجم: ${t.size}</p>
            <button onclick="convertMagnet('${t.url}')">⚡ تحويل وتشغيل</button>
          </div>
        `;
      });
      resultsDiv.innerHTML = html;
    } else {
      resultsDiv.innerHTML = "❌ لا توجد نتائج.";
    }
  } catch (e) {
    resultsDiv.innerHTML = "❌ حصل خطأ.";
  }
}

async function convertMagnet(magnetLink = null) {
  const magnet = magnetLink || document.getElementById("magnetInput").value;
  if (!magnet) return alert("يرجى إدخال رابط مغناطيس");

  const res = await fetch("https://api.real-debrid.com/rest/1.0/torrents/addMagnet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RD_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `magnet=${encodeURIComponent(magnet)}`
  });
  const data = await res.json();
  if (!data.id) return alert("فشل في التحويل");

  const info = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${data.id}`, {
    headers: { Authorization: `Bearer ${RD_API_KEY}` }
  }).then(r => r.json());

  const file = info.files?.[0];
  if (!file) return alert("لم يتم العثور على ملفات");

  const dl = await fetch("https://api.real-debrid.com/rest/1.0/unrestrict/link", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RD_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `link=${encodeURIComponent(file.link)}`
  }).then(r => r.json());

  const div = document.getElementById("convertedResult") || document.getElementById("torrent-results");
  div.innerHTML = `
    ✅ تم التحويل<br/>
    🔗 <a href="${dl.download}" target="_blank">تحميل</a> |
    ▶️ <a href="${dl.download}" target="_blank">تشغيل</a> |
    📺 <a href="vlc://${dl.download}">VLC</a>
  `;
}
