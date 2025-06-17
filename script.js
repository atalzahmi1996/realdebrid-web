
const API_KEY = '47b972fb486f4c35b33845e1a39359e0';
const RD_API_KEY = '45COHUVTBKMQVASD5DGCO7FHUWL6FGRJKZBTUONAWO2C56NNQK3A';

async function fetchMovies() {
  const res = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`);
  const data = await res.json();
  const moviesSection = document.getElementById('movies');
  moviesSection.innerHTML = '';
  data.results.forEach(movie => {
    const div = document.createElement('div');
    div.className = 'movie';
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title}" />
      <h3>${movie.title}</h3>
    `;
    moviesSection.appendChild(div);
  });
}

async function convertMagnet() {
  const input = document.getElementById('magnetInput').value;
  const magnetLinks = document.getElementById('magnetLinks');
  magnetLinks.innerHTML = '🔄 جاري التحويل...';
  const res = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RD_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `magnet=${encodeURIComponent(input)}`,
  });
  const data = await res.json();
  if (data.id) {
    const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${data.id}`, {
      headers: { 'Authorization': `Bearer ${RD_API_KEY}` }
    });
    const info = await infoRes.json();
    const file = info.files[0];
    const dlRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RD_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `link=${encodeURIComponent(file.link)}`,
    });
    const dlData = await dlRes.json();
    magnetLinks.innerHTML = `
      <p><a href="${dlData.download}" target="_blank">▶️ تشغيل</a></p>
      <p><a href="${dlData.download}" download>⬇️ تنزيل</a></p>
      <p><a href="vlc://${dlData.download}">📺 تشغيل في VLC</a></p>
    `;
  } else {
    magnetLinks.innerHTML = '❌ فشل التحويل';
  }
}

fetchMovies();
