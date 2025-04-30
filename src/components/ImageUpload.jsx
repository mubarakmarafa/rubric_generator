import React, { useState } from 'react';

const ImageUpload = ({ onImageUpload }) => {
  const [image, setImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result;
        setImage(imageData);
        onImageUpload(imageData);
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      onImageUpload(null);
    }
  };

  return (
    <div>
      <h2>Upload Worksheet Question</h2>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      {image && (
        <div style={{ marginTop: '1rem' }}>
          <img src={image} alt="Uploaded" style={{ maxWidth: '100%', maxHeight: 400 }} />
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 