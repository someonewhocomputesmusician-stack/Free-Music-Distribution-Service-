require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const YouTubeOAuthManager = require('./src/services/youtubeOAuthManager');
const YouTubeMusicDistributionService = require('./src/services/youtubeDistributionService');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize OAuth Manager
const oauthManager = new YouTubeOAuthManager();
const distributionService = new YouTubeMusicDistributionService(oauthManager);

// AUTH ROUTES
app.get('/auth/youtube', (req, res) => {
  try {
    const authUrl = oauthManager.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate authentication', details: error.message });
  }
});

app.get('/auth/youtube/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }
    const tokens = await oauthManager.exchangeCodeForTokens(code);
    req.session = req.session || {};
    req.session.tokens = tokens;
    res.json({
      success: true,
      message: 'Authentication successful',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expiry_date
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code for tokens', details: error.message });
  }
});

app.post('/auth/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    const newCredentials = await oauthManager.refreshAccessToken(refreshToken);
    res.json({
      success: true,
      credentials: {
        access_token: newCredentials.access_token,
        expires_in: newCredentials.expiry_date
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh token', details: error.message });
  }
});

// ARTIST CHANNEL ROUTES
app.post('/artist/channel/create', async (req, res) => {
  try {
    const { accessToken, artistData } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const channel = await distributionService.createArtistChannel(artistData);
    res.json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create artist channel', details: error.message });
  }
});

// MUSIC UPLOAD ROUTES
app.post('/music/upload', async (req, res) => {
  try {
    const { accessToken, musicFilePath, metadata } = req.body;
    if (!accessToken || !musicFilePath || !metadata) {
      return res.status(400).json({ error: 'Access token, music file path, and metadata are required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const uploadResult = await distributionService.uploadMusic(musicFilePath, metadata);
    res.json({ success: true, upload: uploadResult });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload music', details: error.message });
  }
});

// PLAYLIST ROUTES
app.get('/playlists', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const playlists = await distributionService.getArtistPlaylists();
    res.json({ success: true, playlists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists', details: error.message });
  }
});

app.post('/playlists/create', async (req, res) => {
  try {
    const { accessToken, playlistData } = req.body;
    if (!accessToken || !playlistData) {
      return res.status(400).json({ error: 'Access token and playlist data are required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const playlist = await distributionService.createPlaylist(playlistData);
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
});

app.post('/playlists/:playlistId/add-video', async (req, res) => {
  try {
    const { accessToken, videoId } = req.body;
    const { playlistId } = req.params;
    if (!accessToken || !videoId) {
      return res.status(400).json({ error: 'Access token and video ID are required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const result = await distributionService.addVideoToPlaylist(playlistId, videoId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add video to playlist', details: error.message });
  }
});

// VIDEO MANAGEMENT ROUTES
app.put('/videos/:videoId/metadata', async (req, res) => {
  try {
    const { accessToken, metadata } = req.body;
    const { videoId } = req.params;
    if (!accessToken || !metadata) {
      return res.status(400).json({ error: 'Access token and metadata are required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const updatedVideo = await distributionService.updateVideoMetadata(videoId, metadata);
    res.json({ success: true, video: updatedVideo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video metadata', details: error.message });
  }
});

app.get('/videos/:videoId/analytics', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const { videoId } = req.params;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const analytics = await distributionService.getVideoAnalytics(videoId);
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video analytics', details: error.message });
  }
});

app.delete('/videos/:videoId', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const { videoId } = req.params;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const result = await distributionService.deleteVideo(videoId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video', details: error.message });
  }
});

app.post('/videos/:videoId/thumbnail', async (req, res) => {
  try {
    const { accessToken, thumbnailPath } = req.body;
    const { videoId } = req.params;
    if (!accessToken || !thumbnailPath) {
      return res.status(400).json({ error: 'Access token and thumbnail path are required' });
    }
    oauthManager.setCredentials({ access_token: accessToken });
    const result = await distributionService.setVideoThumbnail(videoId, thumbnailPath);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set video thumbnail', details: error.message });
  }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Music Distribution Backend Server running on port ${PORT}`);
});

module.exports = app;