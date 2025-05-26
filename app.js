const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // reemplaza esto

app.use(express.static('.'));

app.get('/videos', async (req, res) => {
  try {
    const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: 'videos cristianos para niños',
        maxResults: 10,
        type: 'video',
        key: API_KEY
      }
    });

    const result = await Promise.all(data.items.map(async item => {
      const videoId = item.id.videoId;
      const channelId = item.snippet.channelId;
      const channelThumb = await getChannelThumbnail(channelId);
      return {
        id: videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        channelThumbnail: channelThumb
      };
    }));

    res.json(result);
  } catch (e) {
    res.status(500).send('Error al obtener videos');
  }
});

app.get('/shorts', async (req, res) => {
  const query = req.query.q || 'shorts cristianos para niños';
  try {
    const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: query,
        maxResults: 10,
        type: 'video',
        videoDuration: 'short',
        key: API_KEY
      }
    });

    const result = await Promise.all(data.items.map(async item => {
      const videoId = item.id.videoId;
      const channelId = item.snippet.channelId;
      const channelThumb = await getChannelThumbnail(channelId);
      return {
        id: videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        channelThumbnail: channelThumb
      };
    }));

    res.json(result);
  } catch (e) {
    res.status(500).send('Error en Shorts');
  }
});

async function getChannelThumbnail(channelId) {
  try {
    const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
      params: {
        part: 'snippet',
        id: channelId,
        key: API_KEY
      }
    });
    return data.items[0].snippet.thumbnails.default.url;
  } catch (e) {
    return '';
  }
}

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));