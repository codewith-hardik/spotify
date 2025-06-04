// Global variables
let currentSong = new Audio();
let songs = [];
let currfolder = "";

// Format time as mm:ss
function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Main function - will execute when page loads
async function main() {
    console.log("Starting Spotify Clone...");
    
    try {
        // Step 1: Load all playlists first
        console.log("Fetching playlists...");
        let playlists = await fetchPlaylists();
        
        // If no playlists found through automated detection, use hard-coded playlists
        if (playlists.length === 0) {
            console.warn("Using hard-coded playlists as fallback");
            // Hard-coded playlists - you can add more
            playlists = [
                {
                    name: "playlist1",
                    path: "songs/playlist1",
                    title: "My First Playlist",
                    description: "Favorite Songs"
                },
                {
                    name: "playlist2",
                    path: "songs/playlist2",
                    title: "My Second Playlist",
                    description: "Chill Music"
                },
                {
                    name: "playlist3",
                    path: "songs/playlist3",
                    title: "Party Mix",
                    description: "Upbeat Party Songs"
                }
                // Add more playlists as needed
            ];
        }
        
        if (playlists.length === 0) {
            console.error("No playlists found!");
            const cardContainer = document.querySelector(".cardContainer");
            if (cardContainer) {
                cardContainer.innerHTML = 
                    `<div class="error-message">No playlists found. Please check your folder structure.</div>`;
            }
            return;
        }
        
        console.log(`Found ${playlists.length} playlists:`, playlists);
        
        // Step 2: Display playlists in both card view and library
        displayPlaylistCards(playlists);
        displayLibraryPlaylists(playlists);
        
        // Step 3: Load songs from the first playlist
        if (playlists.length > 0) {
            const firstPlaylist = playlists[0];
            console.log(`Loading songs from first playlist: ${firstPlaylist.name}`);
            
            songs = await fetchSongs(firstPlaylist.path);
            
            // If no songs found in the first playlist, try loading dummy songs
            if (songs.length === 0) {
                console.warn("No songs found in the first playlist. Loading dummy songs.");
                songs = ["song1.mp3", "song2.mp3", "song3.mp3"];
            }
            
            console.log(`Loaded ${songs.length} songs from first playlist:`, songs);
            
            // Initialize with first song (but don't play it yet)
            if (songs.length > 0) {
                console.log("Initializing first song:", songs[0]);
                initMusicPlayer(songs[0], firstPlaylist.path, true);
            }
        }
        
        // Step 4: Set up all event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error("Error initializing Spotify Clone:", error);
        // Show fallback UI
        showFallbackUI();
    }
}

// Fallback UI if everything fails
function showFallbackUI() {
    const cardContainer = document.querySelector(".cardContainer");
    if (cardContainer) {
        cardContainer.innerHTML = `
            <div class="error-message">
                <h3>There was an error loading content</h3>
                <p>Please check your browser console for details.</p>
                <button class="retry-button" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Fetch all available playlists
async function fetchPlaylists() {
    try {
        console.log("Fetching playlists from /songs/ directory");
        const response = await fetch("/songs/");
        
        if (!response.ok) {
            console.error(`Failed to fetch playlists: ${response.status}`);
            return [];
        }
        
        const html = await response.text();
        console.log("Received directory listing HTML");
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const links = doc.querySelectorAll("a");
        
        console.log(`Found ${links.length} links in directory listing`);
        
        const playlists = [];
        
        // Process each link
        for (const link of links) {
            const href = link.getAttribute("href");
            const text = link.textContent;
            
            console.log(`Examining link: href="${href}", text="${text}"`);
            
            // Check if it's a directory and not parent directory
            if (href && href.endsWith("/") && !href.includes("..")) {
                console.log(`Found potential playlist folder: ${href}`);
                let folderName = href.replace("/", "");
                
                if (folderName && folderName !== "") {
                    const playlistPath = `songs/${folderName}`;
                    console.log(`Adding playlist: ${folderName}, path: ${playlistPath}`);
                    
                    // Try to load playlist info
                    try {
                        const infoResponse = await fetch(`/${playlistPath}/info.json`);
                        
                        if (infoResponse.ok) {
                            const info = await infoResponse.json();
                            playlists.push({
                                name: folderName,
                                path: playlistPath,
                                title: info.title || folderName,
                                description: info.description || "Playlist",
                            });
                            console.log(`Added playlist with info: ${info.title}`);
                        } else {
                            // No info.json, use folder name
                            playlists.push({
                                name: folderName,
                                path: playlistPath,
                                title: folderName,
                                description: "Playlist",
                            });
                            console.log(`Added playlist without info.json: ${folderName}`);
                        }
                    } catch (error) {
                        console.warn(`Error loading info.json for ${folderName}:`, error);
                        // Error loading info.json, use folder name
                        playlists.push({
                            name: folderName,
                            path: playlistPath,
                            title: folderName,
                            description: "Playlist",
                        });
                    }
                }
            }
        }
        
        console.log(`Total playlists found: ${playlists.length}`);
        return playlists;
        
    } catch (error) {
        console.error("Error fetching playlists:", error);
        return [];
    }
}

// Fetch songs from a playlist
async function fetchSongs(playlistPath) {
    try {
        console.log(`Fetching songs from: ${playlistPath}`);
        currfolder = playlistPath;
        
        const response = await fetch(`/${playlistPath}/`);
        
        if (!response.ok) {
            console.error(`Failed to fetch songs from ${playlistPath}: ${response.status}`);
            return [];
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const links = doc.querySelectorAll("a");
        
        console.log(`Found ${links.length} links in playlist`);
        
        const songsList = [];
        
        // Find all MP3 and M4A files
        for (const link of links) {
            const href = link.getAttribute("href");
            const text = link.textContent.trim();
            
            console.log(`Examining file: ${text}, href: ${href}`);
            
            if (href && (href.endsWith(".mp3") || href.endsWith(".m4a"))) {
                // Use the text content which is the filename
                songsList.push(text);
                console.log(`Added song: ${text}`);
            }
        }
        
        console.log(`Found ${songsList.length} songs in ${playlistPath}`);
        return songsList;
        
    } catch (error) {
        console.error(`Error fetching songs from ${playlistPath}:`, error);
        return [];
    }
}

// Display playlist cards in the main view
function displayPlaylistCards(playlists) {
    const cardContainer = document.querySelector(".cardContainer");
    
    if (!cardContainer) {
        console.error("Card container not found!");
        return;
    }
    
    // Clear existing content
    cardContainer.innerHTML = "";
    
    // Create a card for each playlist
    playlists.forEach((playlist, index) => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.path = playlist.path;
        
        // Check if cover image exists
        const coverUrl = `/${playlist.path}/cover.jpg`;
        
        card.innerHTML = `
            <div class="card-inner">
                <img src="${coverUrl}" alt="${playlist.title}" class="card-img" onerror="this.src='img/icon2.png';">
                <div class="play-button-container">
                    <img src="img/play.svg" class="play-button" alt="Play">
                </div>
            </div>
            <h3 class="card-title">${playlist.title}</h3>
            <p class="card-description">${playlist.description}</p>
        `;
        
        // Add click event to play this playlist
        card.addEventListener("click", async () => {
            try {
                console.log(`Clicked on playlist: ${playlist.name}`);
                let songsList = await fetchSongs(playlist.path);
                
                // If no songs found, use dummy songs for testing
                if (songsList.length === 0) {
                    console.warn("No songs found in this playlist, using dummy songs");
                    songsList = ["song1.mp3", "song2.mp3", "song3.mp3"];
                }
                
                if (songsList.length > 0) {
                    songs = songsList;
                    console.log(`Playing first song from playlist: ${songsList[0]}`);
                    initMusicPlayer(songsList[0], playlist.path);
                }
            } catch (error) {
                console.error("Error playing playlist:", error);
            }
        });
        
        cardContainer.appendChild(card);
    });
}

// Display playlists in the library sidebar
function displayLibraryPlaylists(playlists) {
    const libraryList = document.querySelector(".songList ul");
    
    if (!libraryList) {
        console.error("Library list not found!");
        const songList = document.querySelector(".songList");
        
        if (songList) {
            songList.innerHTML = "<ul></ul>";
            displayLibraryPlaylists(playlists); // Try again
            return;
        } else {
            return;
        }
    }
    
    // Clear existing items
    libraryList.innerHTML = "";
    
    // Create a list item for each playlist
    playlists.forEach(playlist => {
        const li = document.createElement("li");
        li.className = "library-item";
        li.dataset.path = playlist.path;
        
        // Check if cover image exists
        const coverUrl = `/${playlist.path}/cover.jpg`;
        
        li.innerHTML = `
            <div class="playlist-item">
                <div class="playlist-cover">
                    <img src="${coverUrl}" alt="${playlist.title}" onerror="this.src='img/music.svg';">
                </div>
                <div class="playlist-info">
                    <div class="playlist-title">${playlist.title}</div>
                    <div class="playlist-subtitle">
                        <span class="playlist-type">Playlist</span>
                        <span class="playlist-artist">${playlist.description}</span>
                    </div>
                </div>
                <div class="playlist-play">
                    <img src="img/play.svg" class="playlist-play-icon" alt="Play">
                </div>
            </div>
        `;
        
        // Add click event to play this playlist
        li.addEventListener("click", async () => {
            try {
                console.log(`Clicked on library playlist: ${playlist.name}`);
                let songsList = await fetchSongs(playlist.path);
                
                // If no songs found, use dummy songs for testing
                if (songsList.length === 0) {
                    console.warn("No songs found in this playlist, using dummy songs");
                    songsList = ["song1.mp3", "song2.mp3", "song3.mp3"];
                }
                
                if (songsList.length > 0) {
                    songs = songsList;
                    console.log(`Playing first song from playlist: ${songsList[0]}`);
                    initMusicPlayer(songsList[0], playlist.path);
                    
                    // Update active state
                    document.querySelectorAll(".library-item").forEach(item => {
                        item.classList.remove("active");
                    });
                    li.classList.add("active");
                }
            } catch (error) {
                console.error("Error playing playlist from library:", error);
            }
        });
        
        libraryList.appendChild(li);
    });
}

// Initialize the music player with a song
function initMusicPlayer(song, folder, paused = false) {
    try {
        console.log(`Initializing music player with song: ${song}, folder: ${folder}`);
        currfolder = folder;
        
        // Set the audio source - CRITICAL FIX: Use the right path format
        const songUrl = `/${folder}/${song}`;
        console.log(`Setting song URL: ${songUrl}`);
        
        // Cancel any existing playback
        currentSong.pause();
        
        // Set new source
        currentSong.src = songUrl;
        
        // Important: Load the song before trying to play
        currentSong.load();
        
        // Clean up song name (remove extension)
        const songTitle = song.replace(/\.(mp3|m4a)$/i, "");
        
        // Update UI elements
        const songNameElement = document.querySelector(".current-song-name");
        if (songNameElement) {
            songNameElement.textContent = songTitle;
        }
        
        // Try to get artist info
        const folderName = folder.split("/").pop();
        fetch(`/songs/${folderName}/info.json`)
            .then(response => response.json())
            .then(info => {
                const artistElement = document.querySelector(".current-artist");
                if (artistElement) {
                    artistElement.textContent = info.description || "Unknown Artist";
                }
            })
            .catch(() => {
                const artistElement = document.querySelector(".current-artist");
                if (artistElement) {
                    artistElement.textContent = "Unknown Artist";
                }
            });
        
        // Update cover image
        const coverElement = document.getElementById("song-cover");
        if (coverElement) {
            coverElement.src = `/${folder}/cover.jpg`;
            coverElement.onerror = () => {
                coverElement.src = "img/icon2.png";
            };
        }
        
        // Play or pause based on parameter
        if (!paused) {
            // Add a small delay to ensure audio is loaded
            setTimeout(() => {
                const playPromise = currentSong.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log("Playback started successfully");
                            document.getElementById("play").src = "img/pause.svg";
                        })
                        .catch(error => {
                            console.error("Error playing song:", error);
                            document.getElementById("play").src = "img/play.svg";
                            // Try one more time
                            setTimeout(() => {
                                currentSong.play()
                                    .then(() => {
                                        document.getElementById("play").src = "img/pause.svg";
                                    })
                                    .catch(() => {
                                        console.error("Failed to play on second attempt");
                                    });
                            }, 1000);
                        });
                }
            }, 300);
        } else {
            document.getElementById("play").src = "img/play.svg";
        }
        
        // Reset progress bar
        document.querySelector(".progressbar").style.width = "0%";
        document.querySelector(".circle").style.left = "0%";
        document.querySelector(".time-elapsed").textContent = "0:00";
        document.querySelector(".time-total").textContent = "0:00";
        
        // Set up progress updates
        setupProgressInterval();
        
    } catch (error) {
        console.error("Error initializing music player:", error);
    }
}

// Set up progress update interval
function setupProgressInterval() {
    if (window.progressInterval) {
        clearInterval(window.progressInterval);
    }
    
    window.progressInterval = setInterval(() => {
        if (!currentSong.paused && !isNaN(currentSong.duration)) {
            // Calculate percentage and update UI
            const percent = (currentSong.currentTime / currentSong.duration) * 100;
            document.querySelector(".progressbar").style.width = `${percent}%`;
            document.querySelector(".circle").style.left = `${percent}%`;
            
            // Update time displays
            document.querySelector(".time-elapsed").textContent = formatTime(currentSong.currentTime);
            document.querySelector(".time-total").textContent = formatTime(currentSong.duration);
        }
    }, 1000);
}

// Set up all event listeners
function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Play/pause button
    const playButton = document.getElementById("play");
    if (playButton) {
        playButton.addEventListener("click", () => {
            console.log("Play button clicked, current state:", currentSong.paused ? "paused" : "playing");
            
            if (currentSong.paused) {
                // First, check if we have a source
                if (!currentSong.src) {
                    console.warn("No song source set");
                    return;
                }
                
                // Try to play with error handling
                const playPromise = currentSong.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log("Playback started");
                            playButton.src = "img/pause.svg";
                        })
                        .catch(error => {
                            console.error("Error playing song:", error);
                        });
                }
            } else {
                currentSong.pause();
                console.log("Playback paused");
                playButton.src = "img/play.svg";
            }
        });
    }
    
    // Previous track button
    const prevButton = document.getElementById("previus");
    if (prevButton) {
        prevButton.addEventListener("click", () => {
            if (!songs || songs.length === 0) {
                console.warn("No songs available for previous button");
                return;
            }
            
            // Get the current song filename
            const currentUrl = currentSong.src;
            console.log(`Current song URL: ${currentUrl}`);
            
            const urlParts = currentUrl.split('/');
            const currentFile = urlParts[urlParts.length - 1];
            const decodedFile = decodeURIComponent(currentFile);
            
            console.log(`Current song file: ${decodedFile}`);
            
            // Find current song index
            let currentIndex = songs.findIndex(song => 
                song === decodedFile || 
                currentUrl.endsWith(encodeURIComponent(song))
            );
            
            console.log(`Found song at index: ${currentIndex}`);
            
            if (currentIndex > 0) {
                console.log(`Playing previous song: ${songs[currentIndex - 1]}`);
                initMusicPlayer(songs[currentIndex - 1], currfolder);
            } else {
                console.log("Already at first song");
            }
        });
    }
    
    // Next track button
    const nextButton = document.getElementById("next");
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            if (!songs || songs.length === 0) {
                console.warn("No songs available for next button");
                return;
            }
            
            // Get the current song filename
            const currentUrl = currentSong.src;
            console.log(`Current song URL: ${currentUrl}`);
            
            const urlParts = currentUrl.split('/');
            const currentFile = urlParts[urlParts.length - 1];
            const decodedFile = decodeURIComponent(currentFile);
            
            console.log(`Current song file: ${decodedFile}`);
            
            // Find current song index
            let currentIndex = songs.findIndex(song => 
                song === decodedFile || 
                currentUrl.endsWith(encodeURIComponent(song))
            );
            
            console.log(`Found song at index: ${currentIndex}`);
            
            if (currentIndex > -1 && currentIndex < songs.length - 1) {
                console.log(`Playing next song: ${songs[currentIndex + 1]}`);
                initMusicPlayer(songs[currentIndex + 1], currfolder);
            } else {
                console.log("Already at last song");
            }
        });
    }
    
    // Seekbar click
    const seekbar = document.querySelector(".seekbar");
    if (seekbar) {
        seekbar.addEventListener("click", e => {
            if (!currentSong.src) {
                console.warn("No song loaded for seekbar");
                return;
            }
            
            const percent = (e.offsetX / seekbar.offsetWidth) * 100;
            console.log(`Seeking to ${percent}%`);
            
            currentSong.currentTime = (percent / 100) * currentSong.duration;
            document.querySelector(".progressbar").style.width = `${percent}%`;
            document.querySelector(".circle").style.left = `${percent}%`;
        });
    }
    
    // Volume control
    const volumerange = document.querySelector(".volumerange");
    if (volumerange) {
        volumerange.addEventListener("input", function() {
            const volumePercent = this.value;
            console.log(`Setting volume to ${volumePercent}%`);
            
            currentSong.volume = volumePercent / 100;
            
            const volumeBar = document.querySelector(".volume-bar");
            const volumeDot = document.querySelector(".volume-dot");
            
            if (volumeBar) volumeBar.style.width = `${volumePercent}%`;
            if (volumeDot) volumeDot.style.left = `${volumePercent}%`;
        });
        
        // Set initial volume
        volumerange.value = 50;
        currentSong.volume = 0.5;
        
        const volumeBar = document.querySelector(".volume-bar");
        if (volumeBar) volumeBar.style.width = "50%";
    }
    
    // Repeat button
    const repeatButton = document.getElementById("repeat");
    if (repeatButton) {
        repeatButton.addEventListener("click", function() {
            this.classList.toggle("active-control");
            currentSong.loop = !currentSong.loop;
            console.log(`Repeat ${currentSong.loop ? "enabled" : "disabled"}`);
        });
    }
    
    // Shuffle button
    const shuffleButton = document.getElementById("shuffle");
    if (shuffleButton) {
        shuffleButton.addEventListener("click", function() {
            this.classList.toggle("active-control");
            console.log("Shuffle clicked");
            // Implement shuffle logic if needed
        });
    }
    
    // Mobile hamburger menu
    const hambarger = document.querySelector(".hambarger");
    if (hambarger) {
        hambarger.addEventListener("click", () => {
            const leftPanel = document.querySelector(".left");
            if (leftPanel) {
                leftPanel.style.left = "0";
                console.log("Menu opened");
            }
        });
    }
    
    // Close mobile menu
    const closeButton = document.querySelector(".x");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            const leftPanel = document.querySelector(".left");
            if (leftPanel) {
                leftPanel.style.left = "-100%";
                console.log("Menu closed");
            }
        });
    }
    
    // Handle end of song
    currentSong.addEventListener("ended", () => {
        const nextButton = document.getElementById("next");
        if (nextButton) {
            console.log("Song ended, playing next");
            nextButton.click();
        }
    });
}

// Add CSS styles for Spotify-like UI
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Card container and cards - Spotify style */
        .cardContainer {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 24px;
            padding: 20px 0;
        }
        
        .card {
            background: #181818;
            border-radius: 8px;
            padding: 16px;
            transition: background-color 0.3s;
            cursor: pointer;
            position: relative;
        }
        
        .card:hover {
            background: #282828;
        }
        
        .card-inner {
            position: relative;
            margin-bottom: 16px;
        }
        
        .card-img {
            width: 100%;
            aspect-ratio: 1/1;
            border-radius: 4px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            object-fit: cover;
        }
        
        .play-button-container {
            position: absolute;
            right: 8px;
            bottom: 8px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: #1db954;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: translateY(8px);
            transition: all 0.3s ease;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }
        
        .card:hover .play-button-container {
            opacity: 1;
            transform: translateY(0);
        }
        
        .play-button {
            width: 24px;
            height: 24px;
            filter: none; /* Ensure play button is visible on green background */
        }
        
        .card-title {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
            margin: 0 0 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .card-description {
            font-size: 14px;
            color: #b3b3b3;
            margin: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* Library sidebar items - Spotify style */
        .library-item {
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .library-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .library-item.active {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .playlist-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .playlist-cover {
            flex-shrink: 0;
        }
        
        .playlist-cover img {
            width: 48px;
            height: 48px;
            border-radius: 4px;
            object-fit: cover;
        }
        
        .playlist-info {
            flex-grow: 1;
            overflow: hidden;
            min-width: 0;
        }
        
        .playlist-title {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .playlist-subtitle {
            display: flex;
            align-items: center;
            color: #b3b3b3;
            font-size: 14px;
            margin-top: 4px;
        }
        
        .playlist-type {
            margin-right: 4px;
        }
        
        .playlist-type::after {
            content: "•";
            margin: 0 4px;
        }
        
        .playlist-artist {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .playlist-play {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #1db954;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .library-item:hover .playlist-play {
            opacity: 1;
        }
        
        .playlist-play-icon {
            width: 16px;
            height: 16px;
            filter: none;
        }
        
        /* Playbar styling fixes */
        .playbar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 90px;
            background-color: #181818;
            border-top: 1px solid #282828;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 16px;
            z-index: 100;
        }
        
        .playbar-left, .playbar-center, .playbar-right {
            display: flex;
            align-items: center;
        }
        
        .playbar-left {
            width: 30%;
            min-width: 180px;
        }
        
        .playbar-center {
            width: 40%;
            max-width: 722px;
            flex-direction: column;
        }
        
        .playbar-right {
            width: 30%;
            min-width: 180px;
            justify-content: flex-end;
        }
        
        .current-song-info {
            display: flex;
            align-items: center;
        }
        
        .song-cover {
            width: 56px;
            height: 56px;
            border-radius: 4px;
            margin-right: 14px;
            object-fit: cover;
        }
        
        .song-details {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .current-song-name {
            color: white;
            font-size: 14px;
            font-weight: 500;
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .current-artist {
            color: #b3b3b3;
            font-size: 11px;
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .song-actions {
            margin-left: 16px;
        }
        
        .like-btn {
            width: 20px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .like-btn:hover {
            opacity: 1;
        }
        
        .playbar-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            gap: 16px;
        }
        
        .play-icon {
            background-color: white;
            border-radius: 50%;
            padding: 8px;
            box-sizing: content-box;
            filter: invert(0);
            transition: transform 0.2s;
        }
        
        .play-icon:hover {
            transform: scale(1.06);
        }
        
        .playbar-progress {
            display: flex;
            align-items: center;
            width: 100%;
            gap: 8px;
        }
        
        .time-elapsed, .time-total {
            color: #b3b3b3;
            font-size: 11px;
            min-width: 40px;
        }
        
        .seekbar {
            position: relative;
            height: 4px;
            background-color: #535353;
            width: 100%;
            border-radius: 2px;
            cursor: pointer;
        }
        
        .progressbar {
            position: absolute;
            height: 100%;
            background-color: #b3b3b3;
            border-radius: 2px;
            width: 0%;
        }
        
        .seekbar:hover .progressbar {
            background-color: #1db954;
        }
        
        .circle {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            height: 12px;
            width: 12px;
            border-radius: 50%;
            background: #fff;
            display: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .seekbar:hover .circle {
            display: block;
        }
        
        .playbar-options {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .volume {
            display: flex;
            align-items: center;
            width: 125px;
        }
        
        .volumeicon {
            width: 20px;
            margin-right: 8px;
        }
        
        .volume-bar-container {
            position: absolute;
            width: 93px;
            height: 4px;
            background-color: #535353;
            border-radius: 2px;
            cursor: pointer;
            pointer-events: none;
        }
        
        .volume-bar {
            height: 100%;
            background-color: #b3b3b3;
            width: 50%;
            border-radius: 2px;
        }
        
        .volume-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            height: 12px;
            width: 12px;
            border-radius: 50%;
            background: #fff;
            display: none;
        }
        
        .range:hover .volume-bar {
            background-color: #1db954;
        }
        
        .range:hover .volume-dot {
            display: block;
        }
        
        .volumerange {
            -webkit-appearance: none;
            width: 93px;
            height: 4px;
            border-radius: 2px;
            background-color: transparent;
            cursor: pointer;
            position: relative;
        }
        
        .volumerange::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
        }
        
        .volumerange::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
        }
        
        /* Error message */
        .error-message {
            color: #ff5555;
            text-align: center;
            padding: 20px;
            background: rgba(255, 0, 0, 0.1);
            border-radius: 8px;
        }
        
        .retry-button {
            background-color: #1db954;
            color: white;
            border: none;
            border-radius: 30px;
            padding: 8px 32px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 16px;
        }
        
        .retry-button:hover {
            transform: scale(1.05);
            background-color: #1ed760;
        }
        
        /* Active controls */
        .active-control {
            color: #1db954 !important;
            filter: brightness(0) saturate(100%) invert(62%) sepia(84%) saturate(2854%) hue-rotate(85deg) brightness(93%) contrast(89%) !important;
            opacity: 1 !important;
        }
    `;
    document.head.appendChild(style);
}

// Start everything
document.addEventListener("DOMContentLoaded", () => {
    addStyles();
    main();
});




