import React from 'react';
import './DetectedQuestion.css';

export default function DetectedQuestion({ question, type, format }) {
  return (
    <div className="detected-question card">
      <h3>Detected Question</h3>
      <div className="question-details">
        <div className="question-text">
          <strong className="question-label">Question</strong>
          <p>{question || 'No question detected'}</p>
        </div>
        <div className="question-type">
          <strong className="question-label">Type</strong>
          <div className="type-badge">
            {type || 'Fill In The Blanks'}
          </div>
        </div>
        <div className="question-format">
          <strong className="question-label">Format</strong>
          <p>{format || 'Fill in the blank with an underscore space for the missing word.'}</p>
        </div>
      </div>
    </div>
  );
} 