import React, { useState, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import useForm from './useForm';
import './App.css';

// Define LoginPage as a separate component outside App
const LoginPage = ({ email, passwordForm, handleLogin, error, theme, onLogout }) => (
  <div className={`login-container ${theme}`}>
    <h1>Playlist Watcher</h1>
    {error && <p className="error">{error}</p>}
    {email}
    {passwordForm}
    <button type="submit" className="login-button" onClick={handleLogin}>
      Login
    </button>
    {onLogout && (
      <button onClick={onLogout} className="logout-button">
        Logout
      </button>
    )}
  </div>
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlists, setPlaylists] = useState(() => JSON.parse(localStorage.getItem('playlists')) || []);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(0);
  const [watched, setWatched] = useState(() => JSON.parse(localStorage.getItem('watched')) || {});
  const [view, setView] = useState('login');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [error, setError] = useState('');

  // Use useForm for email and password
  const [email, emailForm, setEmail] = useForm('', 'Email', 'email', 'email-input', 'email', 'email');
  const [password, passwordForm, setPassword] = useForm('', 'Password', 'password', 'password-input', 'password', 'current-password');

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
    localStorage.setItem('watched', JSON.stringify(watched));
    localStorage.setItem('theme', theme);
    localStorage.setItem('isLoggedIn', isLoggedIn);
    document.body.className = theme;
  }, [playlists, watched, theme, isLoggedIn]);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      setIsLoggedIn(true);
      setView('home');
      setError('');
    } else {
      setError('Please enter a valid email and password.');
    }
  }, [email, password]); // Memoize to prevent unnecessary re-renders

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('login');
    setEmail(''); // Reset email via setEmail from useForm
    setPassword(''); // Reset password via setPassword from useForm
    setPlaylists([]); // Clear playlists on logout
    setWatched({}); // Clear watched data
    setCurrentPlaylistIndex(null); // Reset playlist selection
    setCurrentVideo(0); // Reset video selection
  };

  const handleAddPlaylist = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/playlist?url=${playlistUrl}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const newPlaylist = data;
      setPlaylists([...playlists, newPlaylist]);
      setCurrentPlaylistIndex(playlists.length);
      setCurrentVideo(0);
      setWatched((prev) => ({ ...prev, [playlists.length]: new Set() }));
      setView('playlist');
      setPlaylistUrl('');
    } catch (error) {
      console.error('Error fetching playlist:', error);
      alert(`Something went wrong: ${error.message}. Check the console or verify your backend locally.`);
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
    setView('home');
  };

  const loadPlaylist = (index) => {
    if (playlists[index]) { // Ensure playlist exists
      setCurrentPlaylistIndex(index);
      setCurrentVideo(0);
      setView('playlist');
    } else {
      alert('Playlist not found.');
    }
  };

  const handleVideoClick = (index) => {
    if (currentPlaylistIndex !== null && playlists[currentPlaylistIndex]) {
      setCurrentVideo(index);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`App ${theme}`}>
      <button className="dark-mode-button" onClick={toggleTheme}>
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      {isLoggedIn ? (
        <>
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
          {view === 'home' ? (
            <div className={`dashboard-container ${theme}`}>
              <h1>Playlist Watcher</h1>
              <div className="search-bar">
                <input
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="Paste YouTube Playlist URL"
                />
                <button onClick={handleAddPlaylist}>Add Playlist</button>
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
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playlists.map((playlist, index) => {
                        const totalVideos = playlist.videos.length;
                        const totalDuration = playlist.videos.reduce((sum, video) => sum + video.duration, 0) / 3600;
                        const watchedVideos = watched[index] ? watched[index].size : 0;
                        const watchedTime = watched[index]
                          ? Array.from(watched[index]).reduce(
                              (sum, videoIndex) => sum + playlist.videos[videoIndex].duration,
                              0
                            ) / 3600
                          : 0;
                        return (
                          <tr key={index}>
                            <td>{playlist.name}</td>
                            <td>{totalVideos}</td>
                            <td>{totalDuration.toFixed(2)}</td>
                            <td>{watchedVideos}</td>
                            <td>{watchedTime.toFixed(2)}</td>
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
                  <h1>
                    Now Playing: {playlists[currentPlaylistIndex].videos[currentVideo]?.title || playlists[currentPlaylistIndex].name}
                  </h1>
                  <button className="back-button" onClick={goBackToHome}>Back to Home</button>
                  <div className="player-container">
                    <div className="player-wrapper">
                      <ReactPlayer
                        url={`https://www.youtube.com/watch?v=${playlists[currentPlaylistIndex].videos[currentVideo].videoId}`}
                        controls
                        width="100%"
                        height="100%"
                        onEnded={handleVideoEnd}
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
                          className={`${index === currentVideo ? 'active' : ''} ${
                            watched[currentPlaylistIndex]?.has(index) ? 'watched' : ''
                          }`}
                        >
                          {video.title}
                          <span>{formatDuration(video.duration)}</span>
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
        </>
      ) : (
        <LoginPage
          email={emailForm}
          passwordForm={passwordForm}
          handleLogin={handleLogin}
          error={error}
          theme={theme}
          onLogout={isLoggedIn ? handleLogout : null}
        />
      )}
    </div>
  );
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default App;