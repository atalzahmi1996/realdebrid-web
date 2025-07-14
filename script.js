// ========== الإعدادات ==========
const TMDB_API_KEY = "47b972fb486f4c35b33845e1a39359e0"; // استبدل بمفتاحك
const RD_API_KEY = "45COHUVTBKMQVASD5DGCO7FHUWL6FGRJKZBTUONAWO2C56NNQK3A"; // استبدل بمفتاحك
const BASE_IMG_URL = "https://image.tmdb.org/t/p/w500";

// ========== العناصر ==========
const sections = {
  movies: document.getElementById("movies-section"),
  magnet: document.getElementById("magnet-section"),
  search: document.getElementById("search-section")
};

const buttons = {
  movies: document.getElementById("movies-btn"),
  magnet: document.getElementById("magnet-btn"),
  search: document.getElementById("search-btn")
};

const inputFields = {
  magnet: document.getElementById("magnet-input"),
  search: document.getElementById("search-input")
};

const resultContainers = {
  magnet: document.getElementById("magnet-results"),
  torrent: document.getElementById("torrent-results")
};

// ========== تهيئة التطبيق ==========
document.addEventListener("DOMContentLoaded", () => {
  buttons.movies.addEventListener("click", () => switchSection("movies"));
  buttons.magnet.addEventListener("click", () => switchSection("magnet"));
  buttons.search.addEventListener("click", () => switchSection("search"));

  document.getElementById("convert-btn").addEventListener("click", convertMagnet);
  document.getElementById("torrent-search-btn").addEventListener("click", searchTorrents);

  loadTrendingMovies();
});

// ========== وظائف التنقل ==========
function switchSection(section) {
  Object.values(sections).forEach(sec => sec.classList.remove("active"));
  sections[section].classList.add("active");

  Object.values(buttons).forEach(btn => {
    btn.style.background = "rgba(255, 255, 255, 0.2)";
  });
  buttons[section].style.background = "rgba(255, 255, 255, 0.4)";
}

// ========== وظائف الأفلام ==========
async function loadTrendingMovies() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) throw new Error("فشل في جلب البيانات");

    const data = await response.json();
    displayMovies(data.results);
  } catch (error) {
    console.error("Error loading movies:", error);
    document.getElementById("movies-grid").innerHTML = `
      <div class="error">
        <p>⚠️ فشل تحميل الأفلام: ${error.message}</p>
        <button onclick="loadTrendingMovies()">إعادة المحاولة</button>
      </div>
    `;
  }
}

function displayMovies(movies) {
  const container = document.getElementById("movies-grid");
  container.innerHTML = "";

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img 
        src="${movie.poster_path ? BASE_IMG_URL + movie.poster_path : 'no-poster.jpg'}" 
        alt="${movie.title}"
        onerror="this.src='no-poster.jpg'"
      >
      <h3>${movie.title}</h3>
      <p>⭐ ${movie.vote_average.toFixed(1)}</p>
    `;
    card.addEventListener("click", () => showMovieDetails(movie.id));
    container.appendChild(card);
  });
}

async function showMovieDetails(id) {
  try {
    const [movieRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`)
    ]);

    if (!movieRes.ok || !creditsRes.ok) throw new Error("فشل في جلب التفاصيل");

    const movie = await movieRes.json();
    const credits = await creditsRes.json();

    const director = credits.crew.find(p => p.job === "Director")?.name || "غير معروف";
    const actors = credits.cast.slice(0, 5).map(a => a.name).join(", ") || "غير معروف";

    sections.movies.innerHTML = `
      <button onclick="switchSection('movies')" style="margin-bottom: 20px;">
        <i class="fas fa-arrow-left"></i> العودة
      </button>
      <div class="movie-details">
        <div class="movie-poster">
          <img src="${BASE_IMG_URL + movie.poster_path}" alt="${movie.title}">
        </div>
        <div class="movie-info">
          <h2>${movie.title} (${movie.release_date.slice(0, 4)})</h2>
          <p><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)} | <i class="fas fa-clock"></i> ${movie.runtime} دقيقة</p>
          <p><strong>المخرج:</strong> ${director}</p>
          <p><strong>النجوم:</strong> ${actors}</p>
          <p><strong>القصة:</strong> ${movie.overview || "لا يوجد وصف متاح."}</p>
          <button onclick="searchTorrents('${movie.title} ${movie.release_date.slice(0,4)}')">
            <i class="fas fa-search"></i> بحث عن تورنت
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading details:", error);
    sections.movies.innerHTML = `
      <div class="error">
        <p>⚠️ فشل تحميل التفاصيل: ${error.message}</p>
        <button onclick="switchSection('movies')">العودة</button>
      </div>
    `;
  }
}

// ========== وظائف التورنت ==========
async function searchTorrents(query = null) {
  const searchQuery = query || inputFields.search.value.trim();
  if (!searchQuery) return alert("❗ يرجى إدخال اسم للبحث");

  switchSection("search");
  resultContainers.torrent.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i> جاري البحث عن "${searchQuery}"...
    </div>
  `;

  try {
    // استخدام proxy لتجاوز CORS
    const ytsRes = await fetch(`https://corsproxy.io/?https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(searchQuery)}`);
    const ytsData = await ytsRes.json();

    let html = "<h3><i class='fas fa-torrent'></i> النتائج:</h3>";

    if (ytsData.data?.movies?.length > 0) {
      ytsData.data.movies[0].torrents.forEach(torrent => {
        html += `
          <div class="torrent-result">
            <p><strong>🎬 ${torrent.quality}</strong> | ⏬ ${torrent.size} | 👥 ${torrent.seeds}</p>
            <div class="result-links">
              <a href="javascript:void(0)" onclick="convertMagnet('${torrent.url}')">
                <i class="fas fa-bolt"></i> تحويل وتشغيل
              </a>
              <a href="${torrent.url}" target="_blank">
                <i class="fas fa-download"></i> تنزيل الملف
              </a>
            </div>
          </div>
        `;
      });
    } else {
      html += "<p>❌ لا توجد نتائج من YTS</p>";
    }

    resultContainers.torrent.innerHTML = html;
  } catch (error) {
    console.error("Search error:", error);
    resultContainers.torrent.innerHTML = `
      <div class="error">
        <p>❌ حدث خطأ أثناء البحث: ${error.message}</p>
        <button onclick="searchTorrents('${searchQuery}')">إعادة المحاولة</button>
      </div>
    `;
  }
}

// ========== تحويل المغناطيس ==========
async function convertMagnet(magnetLink = null) {
  const magnet = magnetLink || inputFields.magnet.value.trim();
  if (!magnet) return alert("❗ يرجى إدخال رابط مغناطيسي");

  const resultDiv = magnetLink ? resultContainers.torrent : resultContainers.magnet;
  resultDiv.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i> جاري تحويل الرابط...
    </div>
  `;

  if (!magnetLink) switchSection("magnet");

  try {
    // محاكاة التحويل
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockDownloadLink = "https://example.com/converted-file.mp4";

    resultDiv.innerHTML = `
      <div class="success">
        <p><i class="fas fa-check-circle"></i> تم التحويل بنجاح!</p>
        <div class="result-links">
          <a href="${mockDownloadLink}" target="_blank">
            <i class="fas fa-play"></i> تشغيل مباشر
          </a>
          <a href="${mockDownloadLink}" download>
            <i class="fas fa-download"></i> تنزيل الملف
          </a>
          <a href="vlc://${mockDownloadLink}">
            <i class="fas fa-tv"></i> فتح في VLC
          </a>
        </div>
        <p class="expiry"><i class="fas fa-clock"></i> الرابط صالح لمدة 24 ساعة</p>
      </div>
    `;
  } catch (error) {
    console.error("Conversion error:", error);
    resultDiv.innerHTML = `
      <div class="error">
        <p><i class="fas fa-times-circle"></i> فشل في التحويل: ${error.message}</p>
        ${!magnetLink ? `<button onclick="convertMagnet()">إعادة المحاولة</button>` : ""}
      </div>
    `;
  }
}
