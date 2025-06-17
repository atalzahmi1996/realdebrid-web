const TMDB_API_KEY = "47b972fb486f4c35b33845e1a39359e0";
const RD_API_KEY = "45COHUVTBKMQVASD5DGCO7FHUWL6FGRJKZBTUONAWO2C56NNQK3A";
const baseImageUrl = "https://image.tmdb.org/t/p/w500";

// ========== متغيرات عامة ==========
let currentMovies = [];

// ========== عند تحميل الصفحة ==========
document.addEventListener("DOMContentLoaded", () => {
  loadTrendingMovies();
});

// ========== وظائف التنقل ==========
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.add("hidden");
  });
  document.getElementById(sectionId).classList.remove("hidden");
}

function showManualSearch() {
  showSection("manual-search");
  document.getElementById("searchQuery").value = "";
  document.getElementById("torrent-results").innerHTML = "";
}

// ========== وظائف الأفلام ==========
async function loadTrendingMovies() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error("فشل في جلب البيانات");
    }
    
    const data = await response.json();
    currentMovies = data.results;
    showMovies(currentMovies);
  } catch (error) {
    console.error("Error loading movies:", error);
    document.getElementById("movie-list").innerHTML = `
      <div class="error">
        <p>⚠️ فشل تحميل الأفلام: ${error.message}</p>
        <button onclick="loadTrendingMovies()">إعادة المحاولة</button>
      </div>
    `;
  }
}

function showMovies(movies) {
  const container = document.getElementById("movie-list");
  container.innerHTML = "";
  
  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img 
        src="${movie.poster_path ? baseImageUrl + movie.poster_path : 'no-poster.jpg'}" 
        alt="${movie.title}"
        onerror="this.src='no-poster.jpg'"
      >
      <h3>${movie.title}</h3>
      <p>⭐ ${movie.vote_average.toFixed(1)}</p>
    `;
    card.onclick = () => loadMovieDetails(movie.id);
    container.appendChild(card);
  });
}

async function loadMovieDetails(id) {
  try {
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`)
    ]);
    
    if (!movieResponse.ok || !creditsResponse.ok) {
      throw new Error("فشل في جلب تفاصيل الفيلم");
    }
    
    const movie = await movieResponse.json();
    const credits = await creditsResponse.json();
    
    const director = credits.crew.find(person => person.job === "Director");
    const actors = credits.cast.slice(0, 5).map(actor => actor.name).join(", ");
    
    const section = document.getElementById("movie-details");
    section.innerHTML = `
      <div class="movie-header">
        <h2>${movie.title} (${movie.release_date.slice(0,4)})</h2>
        <p>⭐ ${movie.vote_average.toFixed(1)} | ⏱️ ${movie.runtime} دقيقة</p>
      </div>
      
      <div class="movie-content">
        <img src="${baseImageUrl + movie.poster_path}" alt="${movie.title}" class="movie-poster">
        
        <div class="movie-info">
          <p><strong>المخرج:</strong> ${director?.name || "غير معروف"}</p>
          <p><strong>النجوم:</strong> ${actors || "غير معروف"}</p>
          <p><strong>القصة:</strong> ${movie.overview || "لا يوجد وصف."}</p>
          
          <div class="action-buttons">
            <button onclick="searchTorrents('${movie.title} ${movie.release_date.slice(0,4)}')">
              🔍 بحث عن تورنت
            </button>
          </div>
        </div>
      </div>
      
      <div id="torrent-results"></div>
    `;
    
    showSection("movie-details");
  } catch (error) {
    console.error("Error loading movie details:", error);
    document.getElementById("movie-details").innerHTML = `
      <div class="error">
        <p>⚠️ فشل تحميل التفاصيل: ${error.message}</p>
        <button onclick="loadMovieDetails(${id})">إعادة المحاولة</button>
      </div>
    `;
  }
}

// ========== وظائف التورنت ==========
async function searchTorrents(query) {
  const resultsDiv = document.getElementById("torrent-results");
  resultsDiv.innerHTML = "<div class='loading'>⏳ جاري البحث...</div>";
  
  try {
    // البحث في YTS (لأفلام الـ BluRay)
    const ytsResponse = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}`
    );
    
    const ytsData = await ytsResponse.json();
    let html = "<h3>الروابط المتاحة:</h3>";
    
    if (ytsData.data?.movies?.length > 0) {
      ytsData.data.movies[0].torrents.forEach(torrent => {
        html += `
          <div class="torrent">
            <p><strong>🎬 ${torrent.quality}</strong> | ⏬ ${torrent.size} | 👥 ${torrent.seeds} seeders</p>
            <button onclick="convertMagnet('${torrent.url}')">
              ⚡ تحويل وتشغيل
            </button>
          </div>
        `;
      });
    } else {
      html += "<p>❌ لا توجد نتائج من YTS</p>";
    }
    
    // يمكنك إضافة مصادر أخرى هنا مثل PirateBay أو 1337x
    
    resultsDiv.innerHTML = html;
  } catch (error) {
    console.error("Error searching torrents:", error);
    resultsDiv.innerHTML = `
      <div class="error">
        <p>❌ حصل خطأ أثناء البحث: ${error.message}</p>
        <button onclick="searchTorrents('${query}')">إعادة المحاولة</button>
      </div>
    `;
  }
}

// ========== تحويل روابط المغناطيس ==========
async function convertMagnet(magnetLink = null) {
  const magnet = magnetLink || document.getElementById("magnetInput").value.trim();
  
  if (!magnet) {
    alert("❗ يرجى إدخال رابط مغناطيسي صحيح");
    return;
  }
  
  const resultDiv = magnetLink 
    ? document.getElementById("torrent-results")
    : document.getElementById("convertedResult");
  
  resultDiv.innerHTML = "<div class='loading'>⏳ جاري التحويل...</div>";
  
  try {
    // الخطوة 1: إضافة المغناطيس إلى Real-Debrid
    const addResponse = await fetch("https://api.real-debrid.com/rest/1.0/torrents/addMagnet", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `magnet=${encodeURIComponent(magnet)}`
    });
    
    const addData = await addResponse.json();
    
    if (!addData.id) {
      throw new Error("فشل في إضافة الرابط المغناطيسي");
    }
    
    // الخطوة 2: انتظار حتى يصبح التورنت جاهزاً
    let torrentInfo;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const infoResponse = await fetch(
        `https://api.real-debrid.com/rest/1.0/torrents/info/${addData.id}`,
        { headers: { "Authorization": `Bearer ${RD_API_KEY}` } }
      );
      
      torrentInfo = await infoResponse.json();
      
      if (torrentInfo.status === "downloaded") {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error("انتهى الوقت المخصص للتحويل");
    }
    
    // الخطوة 3: الحصول على رابط التنزيل
    const file = torrentInfo.files.find(f => f.selected);
    
    if (!file) {
      throw new Error("لم يتم العثور على ملفات مختارة");
    }
    
    const unrestrictResponse = await fetch("https://api.real-debrid.com/rest/1.0/unrestrict/link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `link=${encodeURIComponent(file.download)}`
    });
    
    const unrestrictData = await unrestrictResponse.json();
    
    if (!unrestrictData.download) {
      throw new Error("فشل في إنشاء رابط مباشر");
    }
    
    // عرض النتائج
    resultDiv.innerHTML = `
      <div class="success">
        <p>✅ تم التحويل بنجاح!</p>
        <div class="download-links">
          <a href="${unrestrictData.download}" target="_blank" class="download-btn">
            ⬇️ تنزيل الملف
          </a>
          <a href="${unrestrictData.download}" target="_blank" class="play-btn">
            ▶️ تشغيل مباشر
          </a>
          <a href="vlc://${unrestrictData.download}" class="vlc-btn">
            📺 فتح في VLC
          </a>
        </div>
        <p class="expiry">⏳ الرابط صالح لمدة 24 ساعة</p>
      </div>
    `;
    
  } catch (error) {
    console.error("Error converting magnet:", error);
    resultDiv.innerHTML = `
      <div class="error">
        <p>❌ فشل في التحويل: ${error.message}</p>
        ${!magnetLink ? `<button onclick="convertMagnet()">إعادة المحاولة</button>` : ""}
      </div>
    `;
  }
}
