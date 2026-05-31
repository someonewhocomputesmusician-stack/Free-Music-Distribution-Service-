import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Upload.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Upload({ accessToken }) {
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: [],
    privacyStatus: 'private'
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleThumbnailChange = (e) => {
    setThumbnail(e.target.files[0]);
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim());
    setMetadata(prev => ({
      ...prev,
      tags
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file || !metadata.title) {
      setError('Please select a file and enter a title');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      // Upload music to backend
      const uploadResult = await axios.post(
        `${API_BASE_URL}/music/upload`,
        {
          accessToken,
          musicFilePath: file.name,
          metadata
        },
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );

      if (uploadResult.data.success) {
        setSuccess(true);
        setFile(null);
        setThumbnail(null);
        setMetadata({ title: '', description: '', tags: [], privacyStatus: 'private' });
        setUploadProgress(0);
      }
    } catch (err) {
      setError('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Music</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Upload successful!</div>}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label>Music File (MP3, WAV, etc.)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
            required
          />
          {file && <p className="file-name">Selected: {file.name}</p>}
        </div>

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={metadata.title}
            onChange={handleMetadataChange}
            placeholder="Enter song title"
            disabled={uploading}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={metadata.description}
            onChange={handleMetadataChange}
            placeholder="Enter song description"
            disabled={uploading}
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Tags (comma separated)</label>
          <input
            type="text"
            onChange={handleTagsChange}
            placeholder="music, artist, genre"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label>Privacy Status</label>
          <select
            name="privacyStatus"
            value={metadata.privacyStatus}
            onChange={handleMetadataChange}
            disabled={uploading}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>

        <div className="form-group">
          <label>Thumbnail (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            disabled={uploading}
          />
          {thumbnail && <p className="file-name">Selected: {thumbnail.name}</p>}
        </div>

        {uploading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}>
              {uploadProgress}%
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-upload"
          disabled={uploading}
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Music'}
        </button>
      </form>
    </div>
  );
}

export default Upload;
