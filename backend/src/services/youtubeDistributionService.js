const fs = require('fs');
const path = require('path');

class YouTubeMusicDistributionService {
  constructor(youtubeOAuthManager) {
    this.oauthManager = youtubeOAuthManager;
    this.youtube = youtubeOAuthManager.getYouTubeClient();
  }

  /**
   * Create/Setup artist channel on YouTube
   */
  async createArtistChannel(artistData) {
    try {
      const { channelTitle, description, keywords, defaultLanguage } = artistData;

      // Get authenticated user's channel
      const channelsResponse = await this.youtube.channels.list({
        part: 'snippet,contentDetails',
        mine: true
      });

      if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
        throw new Error('User has no YouTube channel');
      }

      const userChannel = channelsResponse.data.items[0];

      // Update channel information
      const updatedChannel = await this.youtube.channels.update({
        part: 'snippet',
        requestBody: {
          id: userChannel.id,
          snippet: {
            title: channelTitle || userChannel.snippet.title,
            description: description || userChannel.snippet.description,
            keywords: keywords || userChannel.snippet.keywords,
            defaultLanguage: defaultLanguage || 'en'
          }
        }
      });

      return {
        channelId: updatedChannel.data.id,
        channelTitle: updatedChannel.data.snippet.title,
        description: updatedChannel.data.snippet.description
      };
    } catch (error) {
      console.error('Error creating artist channel:', error);
      throw error;
    }
  }

  /**
   * Upload music to YouTube Music
   */
  async uploadMusic(musicFile, metadata) {
    try {
      const {
        title,
        description,
        tags,
        categoryId = '10',
        privacyStatus = 'private'
      } = metadata;

      // Read music file
      const fileStream = fs.createReadStream(musicFile);
      const fileSize = fs.statSync(musicFile).size;

      const videoMetadata = {
        snippet: {
          title,
          description,
          tags: tags || [],
          categoryId: categoryId.toString()
        },
        status: {
          privacyStatus
        },
        processingDetails: {
          processingStatus: 'processing'
        }
      };

      const response = await this.youtube.videos.insert({
        part: 'snippet,status,processingDetails',
        requestBody: videoMetadata,
        media: {
          mimeType: 'audio/mpeg',
          body: fileStream
        },
        onUploadProgress: (event) => {
          const progress = Math.round((event.bytesRead / fileSize) * 100);
          console.log(`Upload progress: ${progress}%`);
        }
      });

      return {
        videoId: response.data.id,
        title: response.data.snippet.title,
        status: response.data.status.privacyStatus,
        uploadedAt: response.data.snippet.publishedAt
      };
    } catch (error) {
      console.error('Error uploading music:', error);
      throw error;
    }
  }

  /**
   * Get artist playlists
   */
  async getArtistPlaylists(maxResults = 25) {
    try {
      const response = await this.youtube.playlists.list({
        part: 'snippet,contentDetails',
        mine: true,
        maxResults
      });

      return response.data.items.map(playlist => ({
        playlistId: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        itemCount: playlist.contentDetails.itemCount,
        thumbnail: playlist.snippet.thumbnails.default.url
      }));
    } catch (error) {
      console.error('Error fetching artist playlists:', error);
      throw error;
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(playlistData) {
    try {
      const { title, description, privacyStatus = 'private' } = playlistData;

      const response = await this.youtube.playlists.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title,
            description
          },
          status: {
            privacyStatus
          }
        }
      });

      return {
        playlistId: response.data.id,
        title: response.data.snippet.title,
        description: response.data.snippet.description,
        privacyStatus: response.data.status.privacyStatus
      };
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Add video to playlist
   */
  async addVideoToPlaylist(playlistId, videoId) {
    try {
      const response = await this.youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId
            }
          }
        }
      });

      return {
        itemId: response.data.id,
        playlistId,
        videoId
      };
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw error;
    }
  }

  /**
   * Update video metadata
   */
  async updateVideoMetadata(videoId, metadata) {
    try {
      const { title, description, tags, categoryId } = metadata;

      const response = await this.youtube.videos.update({
        part: 'snippet',
        requestBody: {
          id: videoId,
          snippet: {
            title: title || undefined,
            description: description || undefined,
            tags: tags || undefined,
            categoryId: categoryId || undefined
          }
        }
      });

      return {
        videoId: response.data.id,
        title: response.data.snippet.title,
        description: response.data.snippet.description
      };
    } catch (error) {
      console.error('Error updating video metadata:', error);
      throw error;
    }
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'statistics,status',
        id: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      return {
        videoId,
        views: video.statistics.viewCount || 0,
        likes: video.statistics.likeCount || 0,
        comments: video.statistics.commentCount || 0,
        shares: video.statistics.shareCount || 0,
        status: video.status.privacyStatus
      };
    } catch (error) {
      console.error('Error fetching video analytics:', error);
      throw error;
    }
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId) {
    try {
      await this.youtube.videos.delete({
        id: videoId
      });

      return { success: true, videoId };
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  /**
   * Set video thumbnail
   */
  async setVideoThumbnail(videoId, thumbnailFile) {
    try {
      const fileStream = fs.createReadStream(thumbnailFile);

      const response = await this.youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fileStream
        }
      });

      return {
        videoId,
        thumbnailUrl: response.data.items[0].url
      };
    } catch (error) {
      console.error('Error setting video thumbnail:', error);
      throw error;
    }
  }
}

module.exports = YouTubeMusicDistributionService;