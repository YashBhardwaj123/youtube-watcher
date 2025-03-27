import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import "./App.css";

const BACKEND_URL = "https://youtube-watcher-iwab.onrender.com";

function App() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlists, setPlaylists] = useState(() => JSON.parse(localStorage.getItem("playlists")) || []);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(() => {
    const savedIndex = localStorage.getItem("currentPlaylistIndex");
    return savedIndex !== null ? parseInt(savedIndex) : null;
  });
  const [currentVideo, setCurrentVideo] = useState(() => {
    const savedVideo = localStorage.getItem("currentVideo");
    return savedVideo !== null ? parseInt(savedVideo) : 0;
  });
  const [watched, setWatched] = useState(() => {
    try {
      const savedWatched = localStorage.getItem("watched");
      if (savedWatched) {
        const parsed = JSON.parse(savedWatched);
        // Convert the saved object back to use Sets
        return Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [
            key,
            value instanceof Array ? new Set(value) : new Set()
          ])
        );
      }
      return {};
    } catch (error) {
      console.error("Error loading watched state:", error);
      return {};
    }
  });
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem("view");
    return savedView || "home";
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem("playlists", JSON.stringify(playlists));
      // Convert Sets to arrays before saving to localStorage
      const watchedToSave = Object.fromEntries(
        Object.entries(watched).map(([key, value]) => [
          key,
          value instanceof Set ? Array.from(value) : []
        ])
      );
      localStorage.setItem("watched", JSON.stringify(watchedToSave));
      localStorage.setItem("theme", theme);
      localStorage.setItem("currentPlaylistIndex", currentPlaylistIndex);
      localStorage.setItem("currentVideo", currentVideo);
      localStorage.setItem("view", view);
      document.body.className = theme;
    } catch (error) {
      console.error("Error saving state:", error);
    }
  }, [playlists, watched, theme, currentPlaylistIndex, currentVideo, view]);

  const handleAddPlaylist = async () => {
    if (!playlistUrl.trim()) {
      setError("Please enter a YouTube playlist URL.");
      return;
    }

    // Check if playlist already exists
    const playlistId = playlistUrl.match(/[?&]list=([^&]+)/)?.[1];
    if (!playlistId) {
      setError("Invalid YouTube playlist URL. Please make sure it contains a playlist ID.");
      return;
    }

    // Check for duplicates
    const isDuplicate = playlists.some(playlist => 
      playlist.videos[0]?.videoId && 
      playlist.videos[0].videoId.includes(playlistId)
    );

    if (isDuplicate) {
      setError("This playlist has already been added.");
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setError("");

    try {
      const encodedUrl = encodeURIComponent(playlistUrl);
      const response = await fetch(`${BACKEND_URL}/api/playlist?url=${encodedUrl}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setLoadingProgress(100);

      if (data.error) {
        throw new Error(data.error);
      }

      setPlaylists((prevPlaylists) => [...prevPlaylists, data]);
      setCurrentPlaylistIndex(playlists.length);
      setCurrentVideo(0);
      setWatched((prev) => ({ ...prev, [playlists.length]: new Set() }));
      setView("playlist");
      setPlaylistUrl("");
    } catch (error) {
      setError(error.message);
      console.error("Error loading playlist:", error);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleVideoEnd = () => {
    if (currentPlaylistIndex !== null && playlists[currentPlaylistIndex]) {
      setWatched((prev) => {
        const newWatched = { ...prev };
        const currentSet = new Set(newWatched[currentPlaylistIndex] || []);
        currentSet.add(currentVideo);
        newWatched[currentPlaylistIndex] = currentSet;
        return newWatched;
      });
      const videos = playlists[currentPlaylistIndex].videos;
      if (currentVideo < videos.length - 1) {
        setCurrentVideo(currentVideo + 1);
      }
    }
  };

  const goBackToHome = () => {
    setView("home");
  };

  const loadPlaylist = (index) => {
    if (playlists[index]) {
      setCurrentPlaylistIndex(index);
      setCurrentVideo(0);
      setView("playlist");
    } else {
      setError("Playlist not found.");
    }
  };

  const handleVideoClick = (index) => {
    if (currentPlaylistIndex !== null && playlists[currentPlaylistIndex]) {
      setCurrentVideo(index);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const getPlaylistProgress = (index) => {
    if (!watched[index]) return 0;
    const totalVideos = playlists[index].videos.length;
    const watchedVideos = watched[index].size;
    return (watchedVideos / totalVideos) * 100;
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all playlists and progress? This action cannot be undone.")) {
      setPlaylists([]);
      setWatched({});
      setCurrentPlaylistIndex(null);
      setCurrentVideo(0);
      setView("home");
      localStorage.removeItem("playlists");
      localStorage.removeItem("watched");
      localStorage.removeItem("currentPlaylistIndex");
      localStorage.removeItem("currentVideo");
      setError("");
    }
  };

  return (
    <div className={`App ${theme}`}>
      <header className="header">
        <div className="header-title">
          <h1>Playlist Watcher</h1>
          <span className="creator-name">by YASH BHARDWAJ</span>
        </div>
        <div className="header-buttons">
          <button className="reset-button" onClick={handleReset}>
            Reset All
          </button>
          <button className="dark-mode-button" onClick={toggleTheme}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </header>

      {view === "home" ? (
        <div className={`dashboard-container ${theme}`}>
          <div className="search-bar">
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Paste YouTube Playlist URL"
              disabled={isLoading}
            />
            <button onClick={handleAddPlaylist} disabled={isLoading}>
              {isLoading ? "Loading..." : "Add Playlist"}
            </button>
            {isLoading && (
              <div className="loading-progress">
                <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                <span>{loadingProgress}%</span>
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
          </div>
          <div className="dashboard">
            <h2>Your Playlists</h2>
            {playlists.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Total Videos</th>
                    <th>Total Length (hrs)</th>
                    <th>Videos Watched</th>
                    <th>Time Watched (hrs)</th>
                    <th>Progress</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playlists.map((playlist, index) => {
                    const totalVideos = playlist.videos.length;
                    const totalDuration = playlist.videos.reduce((sum, video) => sum + video.duration, 0) / 3600;
                    const watchedVideos = watched[index] ? watched[index].size : 0;
                    const watchedTime = watched[index]
                      ? Array.from(watched[index]).reduce((sum, videoIndex) => sum + playlist.videos[videoIndex].duration, 0) / 3600
                      : 0;
                    const progress = getPlaylistProgress(index);
                    return (
                      <tr key={index}>
                        <td>{playlist.name}</td>
                        <td>{totalVideos}</td>
                        <td>{totalDuration.toFixed(2)}</td>
                        <td>{watchedVideos}</td>
                        <td>{watchedTime.toFixed(2)}</td>
                        <td>
                          <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <button onClick={() => loadPlaylist(index)}>Play</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No playlists added yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className={`playlist-container ${theme}`}>
          {playlists[currentPlaylistIndex] ? (
            <>
              <div className="playlist-header">
                <h1>Now Playing: {playlists[currentPlaylistIndex].videos[currentVideo]?.title || playlists[currentPlaylistIndex].name}</h1>
                <button onClick={goBackToHome}>Back to Home</button>
              </div>
              <div className="player-container">
                <div className="player-wrapper">
                  <ReactPlayer
                    url={`https://www.youtube.com/watch?v=${playlists[currentPlaylistIndex].videos[currentVideo].videoId}`}
                    controls
                    width="100%"
                    height="100%"
                    onEnded={handleVideoEnd}
                    playing
                    config={{
                      youtube: {
                        playerVars: {
                          modestbranding: 1,
                          rel: 0,
                          showinfo: 0,
                        },
                      },
                    }}
                  />
                </div>
              </div>
              <div className="playlist">
                <h4>Playlist</h4>
                <ul>
                  {playlists[currentPlaylistIndex].videos.map((video, index) => (
                    <li
                      key={video.videoId}
                      onClick={() => handleVideoClick(index)}
                      className={`${index === currentVideo ? "active" : ""} ${watched[currentPlaylistIndex]?.has(index) ? "watched" : ""}`}
                    >
                      <div className="video-info">
                        <span className="video-number">{index + 1}</span>
                        <span className="video-title">{video.title}</span>
                      </div>
                      <span className="video-duration">{formatDuration(video.duration)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>No playlist selected. Go back to home to select one.</p>
          )}
        </div>
      )}

      <footer className="footer">
        <p>Created by YASH BHARDWAJ</p>
      </footer>
    </div>
  );
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default App;