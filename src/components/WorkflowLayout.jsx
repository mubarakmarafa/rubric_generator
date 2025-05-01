import React, { useState, useEffect } from 'react';
import './WorkflowLayout.css';
import ImageUpload from './ImageUpload';
import { generateRubric } from '../services/openaiService';
import { executeWorkflow, detectQuestionType } from '../services/workflowService';

const DEFAULT_WORKFLOWS = [
  {
    id: 1,
    name: 'Question Type Based Rubric',
    steps: [
      {
        id: 'step2',
        title: 'Short Answer Rubric',
        prompt: 'For this simple factual question: {question}\nGenerate a single criterion that ONLY states the correct answer. Format exactly as: "1. Correct answer: [answer]". Keep it under 8 words. Do not add any explanations, guidance, or extra context.',
        conditions: [
          { id: 'condition3', outputKey: 'type', operator: 'equals', value: 'short_answer', targetStepId: null }
        ]
      },
      {
        id: 'step3',
        title: 'Long Answer Rubric',
        prompt: 'For this complex question: {question}\nGenerate exactly 3 criteria, each 4-5 words maximum. Total word limit: 15 words.\nFocus on key evaluation points only.\nOutput only numbered criteria.\nDo not include any explanations, guidance, or headings.',
        conditions: [
          { id: 'condition4', outputKey: 'type', operator: 'equals', value: 'long_answer', targetStepId: null }
        ]
      },
      {
        id: 'step4',
        title: 'Multiple Choice Rubric',
        prompt: 'For this multiple choice question: {question}\nGenerate exactly two criteria:\n1. State the correct answer (e.g., "Correct answer: B")\n2. One criterion about selection clarity\nTotal word limit: 8-15 words.\nOutput only the numbered criteria.',
        conditions: [
          { id: 'condition5', outputKey: 'type', operator: 'equals', value: 'multiple_choice', targetStepId: null }
        ]
      },
      {
        id: 'step5',
        title: 'Fill in the Blanks Rubric',
        prompt: 'For this fill in the blanks question: {question}\nFirst, count the number of blanks in the question.\nThen, generate criteria as follows:\n1. State the correct answer for each blank in order\n2. If there are multiple blanks, add "All blanks must be filled"\n3. If spelling/grammar is critical, add "Correct spelling and grammar"\nKeep each criterion under 8 words. Total word limit: 20 words.\nOutput only the numbered criteria.',
        conditions: [
          { id: 'condition6', outputKey: 'type', operator: 'equals', value: 'fill_in_the_blanks', targetStepId: null }
        ]
      },
      {
        id: 'step6',
        title: 'True/False Rubric',
        prompt: 'For this true/false question: {question}\nGenerate exactly one criterion stating the correct answer.\nFormat as: "1. Correct answer: [True/False]"\nDo not add any explanations or context.',
        conditions: [
          { id: 'condition7', outputKey: 'type', operator: 'equals', value: 'true_false', targetStepId: null }
        ]
      },
      {
        id: 'step7',
        title: 'Matching Rubric',
        prompt: 'For this matching question: {question}\nGenerate exactly two criteria:\n1. List all correct matches (e.g., "A-1, B-2, C-3")\n2. One criterion about completion\nTotal word limit: 15 words.\nOutput only the numbered criteria.',
        conditions: [
          { id: 'condition8', outputKey: 'type', operator: 'equals', value: 'matching', targetStepId: null }
        ]
      },
      {
        id: 'step8',
        title: 'Ordering Rubric',
        prompt: 'For this ordering question: {question}\nGenerate exactly two criteria:\n1. List the correct sequence (e.g., "Correct order: A, B, C, D")\n2. One criterion about completeness\nTotal word limit: 15 words.\nOutput only the numbered criteria.',
        conditions: [
          { id: 'condition9', outputKey: 'type', operator: 'equals', value: 'ordering', targetStepId: null }
        ]
      }
    ]
  }
];

export default function WorkflowLayout() {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('openai_api_key') || '';
  });
  const [isKeySet, setIsKeySet] = useState(!!localStorage.getItem('openai_api_key'));
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(!localStorage.getItem('openai_api_key'));

  const [image, setImage] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(null);
  const [detectedQuestion, setDetectedQuestion] = useState(() => {
    const saved = localStorage.getItem('detectedQuestion');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDetectingQuestion, setIsDetectingQuestion] = useState(false);

  const [workflows, setWorkflows] = useState(DEFAULT_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState(DEFAULT_WORKFLOWS[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(selectedWorkflow.name);

  // Step editing state
  const [editingStepId, setEditingStepId] = useState(null);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [stepTitleInput, setStepTitleInput] = useState('');
  const [stepPromptInputs, setStepPromptInputs] = useState(
    selectedWorkflow.steps.map(step => step.prompt)
  );

  // Add state for which step is expanded for adding a condition
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [newCondition, setNewCondition] = useState({ outputKey: '', operator: 'equals', value: '', targetStepId: '' });

  // Update titleInput and stepPromptInputs when selectedWorkflow changes
  useEffect(() => {
    setTitleInput(selectedWorkflow.name);
    setStepPromptInputs(selectedWorkflow.steps.map(step => step.prompt));
  }, [selectedWorkflow]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      setShowApiKeyPrompt(false);
      setIsKeySet(true);
    } else {
      localStorage.removeItem('openai_api_key');
      setShowApiKeyPrompt(true);
      setIsKeySet(false);
    }
  }, [apiKey]);

  // Load workflows from local storage on component mount
  useEffect(() => {
    const savedWorkflows = localStorage.getItem('workflows');
    if (savedWorkflows) {
      const parsed = JSON.parse(savedWorkflows);
      setWorkflows(parsed);
      // If no workflows exist, add the default workflow
      if (parsed.length === 0) {
        const withDefault = [DEFAULT_WORKFLOWS[0]];
        setWorkflows(withDefault);
        localStorage.setItem('workflows', JSON.stringify(withDefault));
      }
    } else {
      // If no workflows in localStorage, initialize with default
      setWorkflows(DEFAULT_WORKFLOWS);
      localStorage.setItem('workflows', JSON.stringify(DEFAULT_WORKFLOWS));
    }
  }, []);

  // Save workflows to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('workflows', JSON.stringify(workflows));
  }, [workflows]);

  // Persist detected question to localStorage
  useEffect(() => {
    if (detectedQuestion) {
      localStorage.setItem('detectedQuestion', JSON.stringify(detectedQuestion));
    } else {
      localStorage.removeItem('detectedQuestion');
    }
  }, [detectedQuestion]);

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
  };

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openaiApiKey', apiKey);
      setIsKeySet(true);
    }
  };

  const handleWorkflowSelect = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowDropdown(false);
  };

  const handleCreateNewWorkflow = () => {
    const newId = workflows.length + 1;
    const newWorkflow = {
      id: newId,
      name: `Workflow ${newId}`,
      steps: [
        { id: 1, title: 'Step 1', prompt: '' },
        { id: 2, title: 'Step 2', prompt: '' }
      ]
    };
    setWorkflows([...workflows, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
    setShowDropdown(false);
  };

  // Workflow title editing
  const handleTitleClick = () => {
    if (isKeySet) setEditingTitle(true);
  };
  const handleTitleChange = (e) => {
    setTitleInput(e.target.value);
  };
  const handleTitleBlur = () => {
    if (titleInput.trim() && titleInput !== selectedWorkflow.name) {
      const updated = workflows.map(wf =>
        wf.id === selectedWorkflow.id ? { ...wf, name: titleInput } : wf
      );
      setWorkflows(updated);
      setSelectedWorkflow({ ...selectedWorkflow, name: titleInput });
    }
    setEditingTitle(false);
  };
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitleInput(selectedWorkflow.name);
      setEditingTitle(false);
    }
  };

  // Step title editing
  const handleStepTitleClick = (step, idx) => {
    setEditingStepId(step.id);
    setStepTitleInput(step.title);
  };
  const handleStepTitleChange = (e) => {
    setStepTitleInput(e.target.value);
  };
  const handleStepTitleBlur = (idx) => {
    // UI only: update local selectedWorkflow for display
    if (stepTitleInput.trim() && stepTitleInput !== selectedWorkflow.steps[idx].title) {
      const updatedSteps = selectedWorkflow.steps.map((step, i) =>
        i === idx ? { ...step, title: stepTitleInput } : step
      );
      setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
    }
    setEditingStepId(null);
  };
  const handleStepTitleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStepTitleBlur(idx);
    } else if (e.key === 'Escape') {
      setEditingStepId(null);
    }
  };

  // Step prompt editing (UI only)
  const handleStepPromptChange = (idx, value) => {
    const updatedPrompts = [...stepPromptInputs];
    updatedPrompts[idx] = value;
    setStepPromptInputs(updatedPrompts);
  };

  const handleStepPromptClick = (stepId, idx) => {
    setEditingPromptId(stepId);
  };

  const handleStepPromptBlur = (idx) => {
    setEditingPromptId(null);
  };

  const handleStepPromptKeyDown = (e, idx) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStepPromptBlur(idx);
    }
  };

  // Handler for opening the add condition accordion
  const handleAddConditionClick = (stepId) => {
    setExpandedStepId(stepId);
    setNewCondition({ outputKey: '', operator: 'equals', value: '', targetStepId: '' });
  };
  // Handler for canceling add condition
  const handleCancelAddCondition = () => {
    setExpandedStepId(null);
    setNewCondition({ outputKey: '', operator: 'equals', value: '', targetStepId: '' });
  };
  // Handler for confirming add condition (UI only)
  const handleConfirmAddCondition = (idx) => {
    // UI only: add to local selectedWorkflow for display
    if (newCondition.outputKey && newCondition.value) {
      const updatedSteps = selectedWorkflow.steps.map((step, i) =>
        i === idx
          ? {
              ...step,
              conditions: [
                ...(step.conditions || []),
                {
                  id: `cond${Date.now()}`,
                  ...newCondition,
                  targetStepId: newCondition.targetStepId || null
                }
              ]
            }
          : step
      );
      setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
      setExpandedStepId(null);
      setNewCondition({ outputKey: '', operator: 'equals', value: '', targetStepId: '' });
    }
  };

  // New handlers from App.backup.jsx
  const handleImageUpload = async (file) => {
    console.log('Image uploaded:', file);
    setImage(file);
    setRubric(null);
    setExecutionProgress(null);
    setDetectedQuestion(null);
    setIsDetectingQuestion(true);

    if (file) {
      setIsLoading(true);
      try {
        // First extract the question text and detect type
        const result = await generateRubric(file, 'Extract the question from this image.');
        if (result) {
          console.log('Question detection result:', result);
          
          setDetectedQuestion({
            text: result.question,
            type: result.type,
            format: result.format
          });
        }
      } catch (error) {
        console.error('Error detecting question:', error);
        alert('Error detecting question from image. Please try again.');
      } finally {
        setIsLoading(false);
        setIsDetectingQuestion(false);
      }
    } else {
      setIsDetectingQuestion(false);
    }
  };

  const handlePromptSubmit = async (prompt) => {
    console.log('handlePromptSubmit called with:', { prompt, selectedWorkflow, image, detectedQuestion });
    
    if (!image && !detectedQuestion?.text) {
      console.log('No image or question text found');
      alert('Please upload an image first');
      return;
    }

    setIsLoading(true);
    setExecutionProgress(null);

    try {
      if (selectedWorkflow) {
        console.log('Starting workflow execution:', selectedWorkflow);
        const results = await executeWorkflow(
          selectedWorkflow, 
          {
            text: detectedQuestion?.text || '',
            type: detectedQuestion?.type || 'short_answer',
            format: detectedQuestion?.format || ''
          },
          (stepIndex, result) => {
            console.log('Step progress:', { stepIndex, result });
            setExecutionProgress({
              currentStep: stepIndex + 1,
              totalSteps: selectedWorkflow.steps.length,
              result: result
            });
          }
        );
        console.log('Workflow execution completed:', results);
        setRubric(results);
      } else {
        console.log('Generating rubric with custom prompt');
        const result = await generateRubric(image, prompt);
        console.log('Rubric generated:', result);
        setRubric(result);
      }
    } catch (error) {
      console.error('Error in handlePromptSubmit:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowExecute = async () => {
    if (!image && !detectedQuestion?.text) {
      alert('Please upload an image first');
      return;
    }

    setIsLoading(true);
    setExecutionProgress(null);

    try {
      const result = await executeWorkflow(
        selectedWorkflow,
        detectedQuestion?.text || image,
        (stepIndex, result) => {
          setExecutionProgress({
            currentStep: stepIndex + 1,
            totalSteps: selectedWorkflow.steps.length,
            result: result
          });
        }
      );
      setRubric(result);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Error executing workflow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = (event) => {
    event.preventDefault();
    const key = event.target.apiKey.value.trim();
    if (key) {
      setApiKey(key);
    }
  };

  const handleApiKeyRemove = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
    setShowApiKeyPrompt(true);
  };

  return (
    <div className="workflow-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          {showApiKeyPrompt ? (
            <div className="api-key-section">
              <h3>Enter OpenAI API Key</h3>
              <form onSubmit={handleApiKeySubmit}>
                <input
                  type="password"
                  name="apiKey"
                  placeholder="Enter your OpenAI API key"
                  required
                  className="api-key-input"
                />
                <button type="submit" className="set-api-key-btn">
                  Save API Key
                </button>
              </form>
            </div>
          ) : (
            <div className="api-key-section">
              <button onClick={handleApiKeyRemove} className="remove-api-key-btn">
                Remove API Key
              </button>
            </div>
          )}

          <ImageUpload onImageUpload={handleImageUpload} />
          
          {isDetectingQuestion && (
            <div className="detection-status">
              <span className="spinner">⏳</span>
              Detecting question and type...
            </div>
          )}
          
          {detectedQuestion && !isDetectingQuestion && (
            <div className="detected-question">
              <h3>Detected Question</h3>
              <div className="question-details">
                <div className="question-text">
                  <strong>Question:</strong> {detectedQuestion.text}
                </div>
                {detectedQuestion.type && (
                  <div className="question-type">
                    <strong>Type:</strong> 
                    <span className={`type-badge ${detectedQuestion.type}`}>
                      {detectedQuestion.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {detectedQuestion.format && (
                  <div className="question-format">
                    <strong>Format:</strong> {detectedQuestion.format}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="workflow-selector card" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="workflow-selector-title">
              {selectedWorkflow.name}
              <span className="dropdown-arrow">{showDropdown ? '▼' : '▶'}</span>
            </div>
          </div>
          
          {showDropdown && (
            <div className="workflow-dropdown open-to-middle">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className={`workflow-dropdown-item ${workflow.id === selectedWorkflow.id ? 'selected' : ''}`}
                  onClick={() => handleWorkflowSelect(workflow)}
                >
                  {workflow.name}
                </div>
              ))}
              <div className="workflow-dropdown-item create-new" onClick={handleCreateNewWorkflow}>
                + Create New Workflow
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-panel">
        <div className="main-panel-header">
          {editingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="workflow-title-input"
              autoFocus
            />
          ) : (
            <h2 className="workflow-title" onClick={handleTitleClick}>
              {selectedWorkflow.name}
            </h2>
          )}
        </div>

        <div className="workflow-steps-scroll">
          <div className="workflow-steps">
            {selectedWorkflow.steps.map((step, idx) => (
              <div
                key={step.id}
                className={`workflow-step step-card ${expandedStepId === step.id ? 'expanded' : ''}`}
              >
                <div className="step-card-row step-card-main-row">
                  {editingStepId === step.id ? (
                    <input
                      type="text"
                      value={stepTitleInput}
                      onChange={handleStepTitleChange}
                      onBlur={() => handleStepTitleBlur(idx)}
                      onKeyDown={(e) => handleStepTitleKeyDown(e, idx)}
                      className="step-title-input"
                      autoFocus
                    />
                  ) : (
                    <h3 className="step-title" onClick={() => handleStepTitleClick(step, idx)}>
                      {step.title}
                    </h3>
                  )}
                </div>

                <div className="step-card-row">
                  {editingPromptId === step.id ? (
                    <textarea
                      value={stepPromptInputs[idx]}
                      onChange={(e) => handleStepPromptChange(idx, e.target.value)}
                      onBlur={() => handleStepPromptBlur(idx)}
                      onKeyDown={(e) => handleStepPromptKeyDown(e, idx)}
                      className="step-prompt-input"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="step-prompt-text"
                      onClick={() => handleStepPromptClick(step.id, idx)}
                    >
                      {step.prompt}
                    </div>
                  )}
                </div>

                <div className="step-card-bottom-bar">
                  <button
                    className="add-condition-btn"
                    onClick={() => handleAddConditionClick(step.id)}
                  >
                    Add Condition
                  </button>
                </div>
              </div>
            ))}

            <button className="add-step-btn" onClick={() => {}}>
              + Add Step
            </button>
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div className="output-panel">
        {isLoading && (
          <div className="loading-indicator">
            {executionProgress ? (
              <div>
                <p>Step {executionProgress.currentStep} of {executionProgress.totalSteps}</p>
                <p>{executionProgress.result}</p>
              </div>
            ) : (
              <p>Generating rubric...</p>
            )}
          </div>
        )}
        
        {rubric && (
          <div className="generated-output">
            <h3>Generated Rubric</h3>
            <pre>{rubric}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 