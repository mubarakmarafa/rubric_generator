import React, { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import PromptInput from './components/PromptInput';
import WorkflowEditor from './components/WorkflowEditor';
import WorkflowManager from './components/WorkflowManager';
import { generateRubric } from './services/openaiService';
import { executeWorkflow, detectQuestionType } from './services/workflowService';

// Default workflow definition
const DEFAULT_WORKFLOW = {
  id: 'default-workflow',
  name: 'Question Type Based Rubric',
  steps: [
    {
      id: 'step2',
      name: 'Short Answer Rubric',
      prompt: 'For this simple factual question: {question}\nGenerate a single criterion that ONLY states the correct answer. Format exactly as: "1. Correct answer: [answer]". Keep it under 8 words. Do not add any explanations, guidance, or extra context.',
      conditions: [
        {
          id: 'condition3',
          outputKey: 'type',
          operator: 'equals',
          value: 'short_answer',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step3',
      name: 'Long Answer Rubric',
      prompt: 'For this complex question: {question}\nGenerate exactly 3 criteria, each 4-5 words maximum. Total word limit: 15 words.\nFocus on key evaluation points only.\nOutput only numbered criteria.\nDo not include any explanations, guidance, or headings.',
      conditions: [
        {
          id: 'condition4',
          outputKey: 'type',
          operator: 'equals',
          value: 'long_answer',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step4',
      name: 'Multiple Choice Rubric',
      prompt: 'For this multiple choice question: {question}\nGenerate exactly two criteria:\n1. State the correct answer (e.g., "Correct answer: B")\n2. One criterion about selection clarity\nTotal word limit: 8-15 words.\nOutput only the numbered criteria.',
      conditions: [
        {
          id: 'condition5',
          outputKey: 'type',
          operator: 'equals',
          value: 'multiple_choice',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step5',
      name: 'Fill in the Blanks Rubric',
      prompt: 'For this fill in the blanks question: {question}\nFirst, count the number of blanks in the question.\nThen, generate criteria as follows:\n1. State the correct answer for each blank in order\n2. If there are multiple blanks, add "All blanks must be filled"\n3. If spelling/grammar is critical, add "Correct spelling and grammar"\nKeep each criterion under 8 words. Total word limit: 20 words.\nOutput only the numbered criteria.',
      conditions: [
        {
          id: 'condition6',
          outputKey: 'type',
          operator: 'equals',
          value: 'fill_in_the_blanks',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step6',
      name: 'True/False Rubric',
      prompt: 'For this true/false question: {question}\nGenerate exactly one criterion stating the correct answer.\nFormat as: "1. Correct answer: [True/False]"\nDo not add any explanations or context.',
      conditions: [
        {
          id: 'condition7',
          outputKey: 'type',
          operator: 'equals',
          value: 'true_false',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step7',
      name: 'Matching Rubric',
      prompt: 'For this matching question: {question}\nGenerate exactly two criteria:\n1. List all correct matches (e.g., "A-1, B-2, C-3")\n2. One criterion about completion\nTotal word limit: 15 words.\nOutput only the numbered criteria.',
      conditions: [
        {
          id: 'condition8',
          outputKey: 'type',
          operator: 'equals',
          value: 'matching',
          targetStepId: null
        }
      ]
    },
    {
      id: 'step8',
      name: 'Ordering Rubric',
      prompt: 'For this ordering question: {question}\nGenerate exactly two criteria:\n1. List the correct sequence (e.g., "Correct order: A, B, C, D")\n2. One criterion about completeness\nTotal word limit: 15 words.\nOutput only the numbered criteria.',
      conditions: [
        {
          id: 'condition9',
          outputKey: 'type',
          operator: 'equals',
          value: 'ordering',
          targetStepId: null
        }
      ]
    }
  ]
};

function App() {
  const [image, setImage] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(null);
  const [apiKey, setApiKey] = useState(() => {
    // Try to restore API key from localStorage
    return localStorage.getItem('openai_api_key') || '';
  });
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(!localStorage.getItem('openai_api_key'));
  const [detectedQuestion, setDetectedQuestion] = useState(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('detectedQuestion');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDetectingQuestion, setIsDetectingQuestion] = useState(false);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      setShowApiKeyPrompt(false);
    } else {
      localStorage.removeItem('openai_api_key');
      setShowApiKeyPrompt(true);
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
        const withDefault = [DEFAULT_WORKFLOW];
        setWorkflows(withDefault);
        localStorage.setItem('workflows', JSON.stringify(withDefault));
      }
    } else {
      // If no workflows in localStorage, initialize with default
      const initial = [DEFAULT_WORKFLOW];
      setWorkflows(initial);
      localStorage.setItem('workflows', JSON.stringify(initial));
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
    console.log('handlePromptSubmit called with:', { prompt, currentWorkflow, image, detectedQuestion });
    
    if (!image && !detectedQuestion?.text) {
      console.log('No image or question text found');
      alert('Please upload an image first');
      return;
    }

    setIsLoading(true);
    setExecutionProgress(null);

    try {
      if (currentWorkflow) {
        console.log('Starting workflow execution:', currentWorkflow);
        const results = await executeWorkflow(
          currentWorkflow, 
          {
            text: detectedQuestion?.text || '',
            type: detectedQuestion?.type || 'short_answer',
            format: detectedQuestion?.format || ''
          },
          (stepIndex, result) => {
            console.log('Step progress:', { stepIndex, result });
            setExecutionProgress({
              currentStep: stepIndex + 1,
              totalSteps: currentWorkflow.steps.length,
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

  const handleWorkflowSave = (workflow) => {
    console.log('Saving workflow:', workflow);
    setWorkflows(prev => {
      const existingIndex = prev.findIndex(w => w.id === workflow.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = workflow;
        return updated;
      }
      return [...prev, workflow];
    });
    setShowWorkflowEditor(false);
  };

  const handleWorkflowSelect = (workflow) => {
    console.log('Workflow selected:', workflow);
    setCurrentWorkflow(workflow);
    setShowWorkflowManager(false);
  };

  const handleWorkflowDelete = (workflowId) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (currentWorkflow?.id === workflowId) {
      setCurrentWorkflow(null);
    }
  };

  const handleWorkflowEdit = (updatedWorkflow) => {
    console.log('Handling workflow edit:', updatedWorkflow);
    // Check if this is a new workflow or an update to an existing one
    const existingIndex = workflows.findIndex(w => w.id === updatedWorkflow.id);
    
    if (existingIndex >= 0) {
      console.log('Updating existing workflow');
      // Update existing workflow
      setWorkflows(prev => prev.map(w => 
        w.id === updatedWorkflow.id ? updatedWorkflow : w
      ));
      if (currentWorkflow?.id === updatedWorkflow.id) {
        setCurrentWorkflow(updatedWorkflow);
      }
    } else {
      console.log('Adding new workflow');
      // Add new workflow
      setWorkflows(prev => [...prev, updatedWorkflow]);
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
        currentWorkflow,
        detectedQuestion?.text || image,
        (stepIndex, result) => {
          setExecutionProgress({
            currentStep: stepIndex + 1,
            totalSteps: currentWorkflow.steps.length,
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
    <div className="App">
      <header className="App-header">
        <h1>Worksheet Rubric Generator</h1>
      </header>
      
      <main>
        {showApiKeyPrompt ? (
          <div className="api-key-prompt">
            <h2>Welcome to the Worksheet Rubric Generator!</h2>
            <p>To use this tool, you'll need an OpenAI API key with access to GPT-4 Vision.</p>
            <form onSubmit={handleApiKeySubmit}>
              <input
                type="password"
                name="apiKey"
                placeholder="Enter your OpenAI API key"
                required
                style={{
                  padding: '0.5rem',
                  width: '300px',
                  marginRight: '0.5rem'
                }}
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
                Save API Key
              </button>
            </form>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              Your API key is stored securely in your browser's local storage and is never sent to our servers.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
              <button
                onClick={handleApiKeyRemove}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Remove API Key
              </button>
            </div>
            <ImageUpload onImageUpload={handleImageUpload} />
            
            {isDetectingQuestion && (
              <div style={{ marginTop: '1rem', color: '#888' }}>
                <span className="spinner" style={{ marginRight: 8 }}>⏳</span>
                Detecting question and type...
              </div>
            )}
            {detectedQuestion && !isDetectingQuestion && (
              <div className="detected-question-box">
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
            
            <PromptInput
              onPromptSubmit={handlePromptSubmit}
              workflows={workflows}
              currentWorkflow={currentWorkflow}
              onWorkflowSelect={handleWorkflowSelect}
            />
            
            {isLoading && (
              <div style={{ marginTop: '1rem' }}>
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
              <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
                <h2>Generated Rubric</h2>
                <p>{rubric}</p>
              </div>
            )}
            
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={() => setShowWorkflowManager(!showWorkflowManager)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {showWorkflowManager ? 'Hide Workflows' : 'Manage Workflows'}
              </button>
            </div>
            
            {showWorkflowManager && (
              <WorkflowManager
                workflows={workflows}
                onWorkflowSelect={handleWorkflowSelect}
                onWorkflowDelete={handleWorkflowDelete}
                onWorkflowEdit={handleWorkflowEdit}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
