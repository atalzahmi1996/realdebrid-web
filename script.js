body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
  background: #111;
  color: #fff;
}

header {
  background: #222;
  padding: 20px;
  text-align: center;
}

h1, h2 {
  margin: 0 0 10px;
}

.movie-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
}

.movie-card {
  width: 150px;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.movie-card:hover {
  transform: scale(1.05);
}
.movie-card img {
  width: 100%;
  border-radius: 8px;
}

#magnet-section {
  padding: 20px;
  border-top: 1px solid #444;
}
#magnetInput, #manualMagnet {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  border: none;
}
button {
  padding: 10px 15px;
  background: #0a84ff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:hover {
  background: #026cd3;
}

.modal {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  justify-content: center;
  align-items: center;
}
.modal-content {
  background: #222;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 500px;
}
.close {
  float: right;
  font-size: 24px;
  cursor: pointer;
}
