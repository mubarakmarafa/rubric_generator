import React, { useState } from 'react';
import { createWorkflow, createStep, createCondition } from '../services/workflowService';

const WorkflowEditor = ({ onWorkflowSave, editingWorkflow }) => {
  const [workflowName, setWorkflowName] = useState(editingWorkflow ? editingWorkflow.name : '');
  const [steps, setSteps] = useState(editingWorkflow ? editingWorkflow.steps : []);
  const [editingWorkflowId, setEditingWorkflowId] = useState(editingWorkflow ? editingWorkflow.id : null);
  const [currentStepName, setCurrentStepName] = useState('');
  const [currentStepPrompt, setCurrentStepPrompt] = useState('');
  const [editingStepId, setEditingStepId] = useState(null);

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

  const addStep = (preset = null) => {
    const newStep = createStep(
      'prompt',
      preset ? preset.prompt : '',
      'gpt-4o',
      preset ? preset.name : 'New Step'
    );
    setSteps(prev => [...prev, newStep]);
    setCurrentStepName(newStep.name);
    setCurrentStepPrompt(newStep.prompt);
  };

  const updateStep = (stepId, updates) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const addCondition = (stepId) => {
    const newCondition = createCondition('type', 'equals', '', '');
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, conditions: [...step.conditions, newCondition] }
        : step
    ));
  };

  const updateCondition = (stepId, conditionId, updates) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId
        ? {
            ...step,
            conditions: step.conditions.map(condition =>
              condition.id === conditionId
                ? { ...condition, ...updates }
                : condition
            )
          }
        : step
    ));
  };

  const handleAddStep = () => {
    if (currentStepName && currentStepPrompt) {
      const newStep = {
        id: Date.now().toString(),
        name: currentStepName,
        prompt: currentStepPrompt,
        conditions: []
      };
      setSteps([...steps, newStep]);
      setCurrentStepName('');
      setCurrentStepPrompt('');
    }
  };

  const handleAddCondition = (stepId) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          conditions: [...step.conditions, {
            id: Date.now().toString(),
            outputKey: 'type',
            operator: 'equals',
            value: '',
            targetStepId: ''
          }]
        };
      }
      return step;
    }));
  };

  const handleUpdateCondition = (stepId, conditionId, updates) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          conditions: step.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, ...updates };
            }
            return condition;
          })
        };
      }
      return step;
    }));
  };

  const handleSave = () => {
    if (!workflowName) {
      alert('Please enter a workflow name');
      return;
    }
    if (steps.length === 0) {
      alert('Please add at least one step to the workflow');
      return;
    }
    onWorkflowSave({
      id: editingWorkflowId || Date.now().toString(),
      name: workflowName,
      steps
    });
    setWorkflowName('');
    setSteps([]);
    setEditingWorkflowId(null);
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Create Workflow</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Enter workflow name"
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={currentStepName}
          onChange={(e) => setCurrentStepName(e.target.value)}
          placeholder="Step name"
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <textarea
          value={currentStepPrompt}
          onChange={(e) => setCurrentStepPrompt(e.target.value)}
          placeholder="Enter step prompt"
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <button
          onClick={handleAddStep}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Step
        </button>
      </div>

      {steps.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3>Steps:</h3>
          {steps.map((step, index) => (
            <div 
              key={step.id}
              style={{
                border: '1px solid #ccc',
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '4px',
                backgroundColor: editingStepId === step.id ? '#f0f0f0' : 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>{index + 1}. {step.name}</span>
                <button
                  onClick={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {editingStepId === step.id ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {editingStepId === step.id && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4>Conditions:</h4>
                    {step.conditions.map(condition => (
                      <div key={condition.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <select
                            value={condition.outputKey}
                            onChange={(e) => handleUpdateCondition(step.id, condition.id, { outputKey: e.target.value })}
                            style={{ padding: '0.25rem' }}
                          >
                            <option value="type">Question Type</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="score">Score</option>
                          </select>
                          
                          <select
                            value={condition.operator}
                            onChange={(e) => handleUpdateCondition(step.id, condition.id, { operator: e.target.value })}
                            style={{ padding: '0.25rem' }}
                          >
                            <option value="equals">equals</option>
                            <option value="contains">contains</option>
                            <option value="greaterThan">greater than</option>
                            <option value="lessThan">less than</option>
                          </select>
                          
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => handleUpdateCondition(step.id, condition.id, { value: e.target.value })}
                            placeholder="Value"
                            style={{ padding: '0.25rem' }}
                          />
                          
                          <select
                            value={condition.targetStepId}
                            onChange={(e) => handleUpdateCondition(step.id, condition.id, { targetStepId: e.target.value })}
                            style={{ padding: '0.25rem' }}
                          >
                            <option value="">Select target step</option>
                            {steps
                              .filter(s => s.id !== step.id)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddCondition(step.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Add Condition
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Save Workflow
      </button>
    </div>
  );
};

export default WorkflowEditor; 