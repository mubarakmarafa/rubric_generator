import React from 'react';
import './AnswerInput.css';

export default function AnswerInput({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder="Your answer"
      className="answer-input card"
    />
  );
} 