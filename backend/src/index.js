require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('YOUTUBE_API_KEY environment variable is not set');
  process.exit(1);
}

// Simple in-memory cache
const playlistCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.use(express.json());

app.use(cors({
  origin: ['http://localhost:3000', 'https://project-playlist-watcher.onrender.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

app.get('/api/playlist', async (req, res) => {
  try {
    const playlistUrl = req.query.url;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'Playlist URL is required' });
    }

    const playlistId = playlistUrl.split('list=')[1]?.split('&')[0];
    if (!playlistId) {
      return res.status(400).json({ error: 'Invalid playlist URL format' });
    }

    // Check cache first
    const cachedData = playlistCache.get(playlistId);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return res.json(cachedData.data);
    }

    // Fetch playlist items with video details in a single request
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: { 
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: 50,
        key: API_KEY,
        fields: 'items(snippet(title),contentDetails(videoId))'
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Playlist not found or empty' });
    }

    // Get video details in batches of 50 (YouTube API limit)
    const videoIds = response.data.items.map(item => item.contentDetails.videoId);
    const videos = [];
    
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: { 
          part: 'contentDetails',
          id: batch.join(','),
          key: API_KEY,
          fields: 'items(contentDetails(duration))'
        },
      });

      const batchVideos = response.data.items.slice(i, i + 50).map((item, index) => ({
        title: item.snippet.title,
        videoId: item.contentDetails.videoId,
        duration: parseDuration(videoResponse.data.items[index].contentDetails.duration),
      }));

      videos.push(...batchVideos);
    }

    const result = { 
      name: response.data.items[0]?.snippet.title || `Playlist ${playlistId}`, 
      videos 
    };

    // Cache the result
    playlistCache.set(playlistId, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching playlist:', error.message);
    if (error.response) {
      // YouTube API error
      res.status(error.response.status).json({ 
        error: 'YouTube API error', 
        details: error.response.data.error?.message || 'Unknown error'
      });
    } else if (error.request) {
      // Network error
      res.status(503).json({ error: 'Network error while connecting to YouTube API' });
    } else {
      // Other error
      res.status(500).json({ error: 'Internal server error while processing playlist' });
    }
  }
});

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));