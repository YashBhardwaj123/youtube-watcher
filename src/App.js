import React, { useState, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import useForm from './useForm';
import './App.css';

const BACKEND_URL = "https://youtube-watcher-iwab.onrender.com";

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
  }, [email, password]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('login');
    setEmail('');
    setPassword('');
    setPlaylists([]);
    setWatched({});
    setCurrentPlaylistIndex(null);
    setCurrentVideo(0);
  };

  const handleAddPlaylist = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/playlist?url=${playlistUrl}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPlaylists([...playlists, data]);
      setCurrentPlaylistIndex(playlists.length);
      setCurrentVideo(0);
      setWatched((prev) => ({ ...prev, [playlists.length]: new Set() }));
      setView('playlist');
      setPlaylistUrl('');
    } catch (error) {
      console.error('Error fetching playlist:', error);
      alert(`Something went wrong: ${error.message}`);
    }
  };

  return (
    <div className={`App ${theme}`}>
      <button className="dark-mode-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      {isLoggedIn ? (
        <>
          <button onClick={handleLogout} className="logout-button">Logout</button>
          <h1>Playlist Watcher</h1>
          <input type="text" value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} placeholder="Paste YouTube Playlist URL" />
          <button onClick={handleAddPlaylist}>Add Playlist</button>
        </>
      ) : (
        <LoginPage email={emailForm} passwordForm={passwordForm} handleLogin={handleLogin} error={error} theme={theme} />
      )}
    </div>
  );
}

export default App;
