const express = require('express');
const axios = require('axios');
const app = express();

console.log('Starting backend...');

// Use environment variable for API key (Render will set this)
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBtjJqRFnmda_uYr8IdVaRaQLBHOGJMDTM'; // Fallback for local testing

console.log('Setting up middleware...');
app.use(express.json());
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'https://playlist-watcher-frontend.onrender.com'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Fallback for other origins
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

console.log('Defining /api/playlist route...');
app.get('/api/playlist', async (req, res) => {
  try {
    console.log('Received request with URL:', req.query.url);
    const playlistUrl = req.query.url;
    const playlistId = playlistUrl.split('list=')[1]?.split('&')[0];
    if (!playlistId) {
      return res.status(400).json({ error: 'Invalid playlist URL' });
    }

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlistItems`,
      {
        params: {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          key: API_KEY,
        },
      }
    );

    const videoIds = response.data.items.map((item) => item.contentDetails.videoId).join(',');

    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          part: 'contentDetails',
          id: videoIds,
          key: API_KEY,
        },
      }
    );

    const videos = response.data.items.map((item, index) => {
      const duration = videoResponse.data.items[index].contentDetails.duration;
      const durationSeconds = parseDuration(duration);
      return {
        title: item.snippet.title,
        videoId: item.contentDetails.videoId,
        duration: durationSeconds,
      };
    });

    res.json({
      name: response.data.items[0]?.snippet.title || `Playlist ${playlistId}`,
      videos,
    });
  } catch (error) {
    console.error('Backend error:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

// Use dynamic port for Render deployment
const PORT = process.env.PORT || 5000;
console.log('Starting server on port', PORT);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});