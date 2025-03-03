const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_NEW_VALID_API_KEY';

app.use(express.json());
app.use(cors());

// Default route to check if the backend is running
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/api/playlist', async (req, res) => {
  try {
    const playlistUrl = req.query.url;
    const playlistId = playlistUrl.split('list=')[1]?.split('&')[0];
    if (!playlistId) return res.status(400).json({ error: 'Invalid playlist URL' });

    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: { part: 'snippet,contentDetails', playlistId, maxResults: 50, key: API_KEY },
    });

    const videoIds = response.data.items.map(item => item.contentDetails.videoId).join(',');

    const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'contentDetails', id: videoIds, key: API_KEY },
    });

    const videos = response.data.items.map((item, index) => ({
      title: item.snippet.title,
      videoId: item.contentDetails.videoId,
      duration: parseDuration(videoResponse.data.items[index].contentDetails.duration),
    }));

    res.json({ name: response.data.items[0]?.snippet.title || `Playlist ${playlistId}`, videos });
  } catch (error) {
    console.error('Backend error:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
