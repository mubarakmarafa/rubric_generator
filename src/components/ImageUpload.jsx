import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ImageUpload({ onImageUpload }) {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const previewUrl = acceptedFiles[0] ? URL.createObjectURL(acceptedFiles[0]) : null;

  return (
    <div
      {...getRootProps()}
      className={`image-upload-dropzone ${isDragActive ? 'active' : ''} ${previewUrl ? 'has-image' : ''}`}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <div className="image-preview">
          <img src={previewUrl} alt="Uploaded question" />
          <div className="image-overlay">
            <p>Click or drag to replace image</p>
          </div>
        </div>
      ) : isDragActive ? (
        <p>Drop the image here...</p>
      ) : (
        <p>Drag & drop an image here, or click to select</p>
      )}
    </div>
  );
} 