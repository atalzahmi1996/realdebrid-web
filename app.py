import os
import re
import json
import base64
from urllib.parse import quote

import requests
from flask import Flask, render_template, request, redirect, url_for

# Flask application setup
app = Flask(__name__)


def list_webdav_files() -> list:
    """Fetch a list of files from the Real‑Debrid WebDAV service.

    If the required environment variables are not set or an error occurs while
    connecting to the WebDAV endpoint, this function will load a set of
    example entries from `sample_data/sample_files.json` for demonstration
    purposes.

    Returns:
        A list of dictionaries with keys `name` and `path`.
    """
    base_url = os.getenv("RD_WEBDAV_URL")
    username = os.getenv("RD_WEBDAV_USERNAME")
    password = os.getenv("RD_WEBDAV_PASSWORD")

    # Fallback to sample data if credentials are missing
    if not (base_url and username and password):
        sample_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_files.json")
        try:
            with open(sample_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    # Prepare PROPFIND request to list directory contents
    headers = {
        "Depth": "1",
        "Content-Type": "application/xml",
    }
    # Request body: ask server to return all properties. Some servers accept
    # empty body but including allprop improves compatibility.
    data = """<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
    <allprop/>
</propfind>"""

    try:
        response = requests.request(
            method="PROPFIND",
            url=base_url,
            headers=headers,
            data=data,
            auth=(username, password),
            timeout=15,
        )
        response.raise_for_status()
    except Exception:
        # On any network or authentication error fallback to sample data
        sample_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_files.json")
        try:
            with open(sample_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    # Parse XML response to extract file paths
    from xml.etree import ElementTree as ET
    try:
        tree = ET.fromstring(response.text)
    except ET.ParseError:
        # If parsing fails, return sample data
        sample_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_files.json")
        try:
            with open(sample_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    namespace = {"d": "DAV:"}
    files = []
    for resp in tree.findall("d:response", namespace):
        href = resp.findtext("d:href", default="", namespaces=namespace)
        # Skip the base directory itself
        if href == "/" or href.rstrip("/") == "":
            continue
        # Extract filename from path
        filename = href.rstrip("/").split("/")[-1]
        # Determine resource type (collection vs file)
        propstat = resp.find("d:propstat", namespace)
        if propstat is not None:
            prop = propstat.find("d:prop", namespace)
            if prop is not None:
                resourcetype = prop.find("d:resourcetype", namespace)
                # Skip directories (collections)
                if resourcetype is not None and resourcetype.find("d:collection", namespace) is not None:
                    continue
        files.append({"name": filename, "path": href})
    return files


def guess_title(filename: str) -> str:
    """Attempt to derive a human‑readable title from a file name.

    The function removes common delimiters (dots, underscores), video
    resolution tags, season/episode markers, and four–digit years.

    Args:
        filename: The raw filename (e.g., "Breaking.Bad.S01E01.720p.mkv").

    Returns:
        A cleaned title suitable for searching TMDb.
    """
    name = filename.rsplit(".", 1)[0]  # remove extension
    # Replace delimiters with spaces
    name = re.sub(r"[._-]+", " ", name)
    # Remove season/episode patterns (S01E01, s01e01, etc.)
    name = re.sub(r"s\d{1,2}e\d{1,2}", "", name, flags=re.IGNORECASE)
    # Remove resolution indicators (720p, 1080p, 2160p, etc.)
    name = re.sub(r"\b\d{3,4}p\b", "", name, flags=re.IGNORECASE)
    # Remove 4‑digit years
    name = re.sub(r"\b\d{4}\b", "", name)
    # Remove extra spaces
    name = re.sub(r"\s+", " ", name).strip()
    return name


def get_tmdb_info(query: str) -> dict:
    """Search TMDb for a movie or TV show and return basic information.

    Args:
        query: The title of the movie or show to search for.

    Returns:
        A dictionary containing `title`, `overview`, `poster_url`, and `media_type`.
        If no results are found or an error occurs, returns an empty dict.
    """
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key or not query:
        return {}
    base_url = "https://api.themoviedb.org/3"
    # Use multi search to cover both movies and tv shows
    params = {
        "api_key": api_key,
        "query": query,
        "language": "en-US",
        "page": 1,
        "include_adult": "false",
    }
    try:
        resp = requests.get(f"{base_url}/search/multi", params=params, timeout=15)
        resp.raise_for_status()
    except Exception:
        return {}
    data = resp.json()
    results = data.get("results", [])
    if not results:
        return {}
    # Pick the first result
    first = results[0]
    media_type = first.get("media_type")
    title = first.get("title") or first.get("name") or query
    overview = first.get("overview", "")
    poster_path = first.get("poster_path")
    poster_url = None
    if poster_path:
        # Use TMDb's image CDN with width 500; this size balances quality and bandwidth
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
    return {
        "title": title,
        "overview": overview,
        "poster_url": poster_url,
        "media_type": media_type,
    }


@app.route("/")
def index():
    """Render the homepage listing all media files.

    Users can select a preferred video player via the `player` query parameter.
    The default player is VLC. Supported players are defined in the `players`
    list. Each item returned from `list_webdav_files` is enriched with TMDb
    information if possible.
    """
    # Supported external players and their URI schemes
    players = {
        "vlc": "vlc://{url}",
        "mxplayer": "mxplayer://{url}",
        "mpv": "mpv://{url}",  # generic example; some players support custom schemes
        "web": "{url}",  # fallback: open in browser
    }
    # Selected player from query parameter
    selected_player = request.args.get("player", "vlc")
    if selected_player not in players:
        selected_player = "vlc"
    # Fetch file list
    entries = list_webdav_files()
    items = []
    for entry in entries:
        filename = entry.get("name")
        path = entry.get("path")
        # Remove leading slash from href if present and ensure proper URL encoding
        if path.startswith("/"):
            path = path[1:]
        # Build the absolute URL for streaming via WebDAV
        base_url = os.getenv("RD_WEBDAV_URL", "").rstrip("/")
        username = os.getenv("RD_WEBDAV_USERNAME", "")
        password = os.getenv("RD_WEBDAV_PASSWORD", "")
        # Encode username and password in a basic auth URL for direct streaming.
        # Note: embedding credentials in the URL is not recommended for production but is
        # convenient when launching external players.
        if username and password:
            auth_part = f"{quote(username)}:{quote(password)}@"
        else:
            auth_part = ""
        file_url = f"{base_url}/{path}"
        # Prepend credentials to the URL if available
        if auth_part:
            # Insert credentials after the protocol (e.g., https://user:pass@host/path)
            protocol, rest = file_url.split("://", 1)
            file_url = f"{protocol}://{auth_part}{rest}"
        # Guess title and fetch TMDb info
        clean_title = guess_title(filename)
        tmdb_info = get_tmdb_info(clean_title)
        title = tmdb_info.get("title", clean_title)
        overview = tmdb_info.get("overview") or ""
        poster_url = tmdb_info.get("poster_url")
        # Construct play link according to the selected player
        play_template = players.get(selected_player, "{url}")
        play_link = play_template.format(url=file_url)
        items.append({
            "filename": filename,
            "title": title,
            "description": overview,
            "poster_url": poster_url,
            "play_link": play_link,
        })
    return render_template(
        "index.html",
        items=items,
        players=list(players.keys()),
        selected_player=selected_player,
    )


if __name__ == "__main__":
    # Enable debug mode only when running directly; in production this should be disabled
    app.run(host="0.0.0.0", port=5000, debug=True)