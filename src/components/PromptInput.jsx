import React, { useState } from 'react';

const PromptInput = ({ onPromptSubmit, workflows = [], currentWorkflow, onWorkflowSelect }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  const presetPrompts = {
    'Identify Question Type': {
      name: 'Question Type Analysis',
      prompt: 'What type of question is this? Please identify if it\'s multiple choice, short answer, essay, or another type. Respond with just the type.'
    },
    'Generate Basic Rubric': {
      name: 'Basic Rubric',
      prompt: 'Create a basic rubric for grading this question. Include 3-4 criteria and their point values.'
    },
    'Detailed Rubric': {
      name: 'Detailed Rubric',
      prompt: 'Create a detailed rubric for this question. Include specific criteria, point values, and descriptions of what constitutes excellent, good, fair, and poor responses.'
    },
    'Analyze Difficulty': {
      name: 'Difficulty Analysis',
      prompt: 'Analyze the difficulty level of this question. Consider factors like complexity, required knowledge, and time needed to answer. Respond with: easy, medium, or hard.'
    },
    'Suggest Improvements': {
      name: 'Improvement Suggestions',
      prompt: 'Suggest improvements for this question. Consider clarity, fairness, and educational value.'
    },
    'Generate Answer Key': {
      name: 'Answer Key',
      prompt: 'Create a detailed answer key for this question, including step-by-step solutions if applicable.'
    }
  };

  const handlePresetSelect = (presetKey) => {
    setSelectedPreset(presetKey);
    setPrompt(presetPrompts[presetKey].prompt);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('PromptInput - handleSubmit called');
    console.log('Current workflow:', currentWorkflow);
    console.log('Prompt:', prompt);
    
    if (currentWorkflow) {
      console.log('Submitting workflow:', currentWorkflow);
      onPromptSubmit(currentWorkflow.steps[0]?.prompt || '');
    } else if (prompt.trim()) {
      console.log('Submitting custom prompt:', prompt);
      onPromptSubmit(prompt);
      setPrompt('');
      setSelectedPreset('');
    }
  };

  const handleWorkflowSelect = (e) => {
    const selectedId = e.target.value;
    console.log('Workflow selected:', selectedId);
    const workflow = workflows.find(w => w.id === selectedId);
    console.log('Found workflow:', workflow);
    onWorkflowSelect(workflow);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <h2>Enter Your Prompt</h2>
      
      {workflows.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3>Select Workflow:</h3>
          <select
            value={currentWorkflow?.id || ''}
            onChange={handleWorkflowSelect}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="">Select a workflow...</option>
            {workflows.map(workflow => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {!currentWorkflow && (
        <div style={{ marginBottom: '1rem' }}>
          <h3>Example Prompts:</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {Object.entries(presetPrompts).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetSelect(key)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: selectedPreset === key ? '#0056b3' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={currentWorkflow ? "Workflow prompt will be automatically filled" : "Enter your prompt here..."}
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '0.5rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          border: '1px solid #ccc'
        }}
        disabled={!!currentWorkflow}
      />
      <button 
        type="submit"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {currentWorkflow ? 'Start Workflow' : 'Generate Rubric'}
      </button>
    </form>
  );
};

export default PromptInput; 