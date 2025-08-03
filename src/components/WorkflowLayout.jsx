import React, { useState, useRef, useEffect } from 'react';

const [showDropdown, setShowDropdown] = useState(false);
const dropdownRef = useRef(null);
const [dropdownPosition, setDropdownPosition] = useState({ top: 0 });

useEffect(() => {
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  const updateDropdownPosition = () => {
    if (dropdownRef.current && showDropdown) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: window.innerHeight - rect.bottom - 10
      });
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('scroll', updateDropdownPosition);
  window.addEventListener('resize', updateDropdownPosition);

  if (showDropdown) {
    updateDropdownPosition();
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    window.removeEventListener('scroll', updateDropdownPosition);
    window.removeEventListener('resize', updateDropdownPosition);
  };
}, [showDropdown]);

const handleImageUpload = async (file) => {
  console.log('Image uploaded:', file);
  
  if (!isKeySet) {
    alert('Please set your OpenAI API key first');
    return;
  }
  
  if (file) {
    try {
      // Convert the file to base64 data URL
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Just store the image data URL and reset states
      setImage(imageDataUrl);
      setRubric(null);
      setExecutionProgress(null);
      setDetectedQuestion(null);
      setIsDetectingQuestion(false);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    }
  }
};

const handleWorkflowExecute = async () => {
  if (!image) {
    alert('Please upload an image first');
    return;
  }

  if (!isKeySet) {
    alert('Please set your OpenAI API key first');
    return;
  }

  setIsLoading(true);
  setIsDetectingQuestion(true);
  setExecutionProgress(null);

  try {
    // First detect the question and type
    const detectionResult = await generateRubric(image, 'Extract the question from this image and determine its type.');
    if (detectionResult) {
      console.log('Question detection result:', detectionResult);
      
      // Parse the result to extract question and type
      const lines = detectionResult.split('\n');
      let questionText = '';
      let questionType = '';
      let format = '';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('question:')) {
          questionText = line.split('question:')[1].trim();
        } else if (line.toLowerCase().includes('type:')) {
          questionType = line.split('type:')[1].trim();
        } else if (line.toLowerCase().includes('format:')) {
          format = line.split('format:')[1].trim();
        }
      }
      
      // Normalize the question type by replacing spaces with underscores
      const normalizedType = questionType.toLowerCase().replace(/\s+/g, '_');
      
      setDetectedQuestion({
        text: questionText,
        type: normalizedType,
        format: format
      });

      // Now execute the workflow with the detected question
      if (selectedWorkflow) {
        // Sync prompts before running workflow
        const updatedSteps = selectedWorkflow.steps.map((step, idx) => ({
          ...step,
          prompt: stepPromptInputs[idx]
        }));
        const updatedWorkflow = { ...selectedWorkflow, steps: updatedSteps };
        console.log('Starting workflow execution:', updatedWorkflow);
        
        const results = await executeWorkflow(
          updatedWorkflow, 
          {
            text: questionText,
            type: normalizedType,
            format: format
          },
          (stepIndex, result) => {
            console.log('Step progress:', { stepIndex, result });
            // Only set the actual rubric criteria, not the step information
            const rubricOnly = result.split('\n').filter(line => 
              !line.startsWith('Step "') && 
              !line.startsWith('QUESTION:') && 
              !line.startsWith('TYPE:')
            ).join('\n').trim();
            
            setExecutionProgress({
              currentStep: stepIndex + 1,
              totalSteps: updatedWorkflow.steps.length,
              result: rubricOnly
            });
          }
        );
        
        console.log('Workflow execution completed:', results);
        // Clean the final results as well
        const cleanResults = results.split('\n').filter(line => 
          !line.startsWith('Step "') && 
          !line.startsWith('QUESTION:') && 
          !line.startsWith('TYPE:')
        ).join('\n').trim();
        setRubric(cleanResults);
      }
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
    alert(error.message || 'Error executing workflow. Please try again.');
  } finally {
    setIsLoading(false);
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
      // Sync prompts before running workflow
      const updatedSteps = selectedWorkflow.steps.map((step, idx) => ({
        ...step,
        prompt: stepPromptInputs[idx]
      }));
      const updatedWorkflow = { ...selectedWorkflow, steps: updatedSteps };
      console.log('Starting workflow execution:', updatedWorkflow);
      const results = await executeWorkflow(
        updatedWorkflow, 
        {
          text: detectedQuestion?.text || '',
          type: detectedQuestion?.type || 'short_answer',
          format: detectedQuestion?.format || ''
        },
        (stepIndex, result) => {
          console.log('Step progress:', { stepIndex, result });
          // Only set the actual rubric criteria, not the step information
          const rubricOnly = result.split('\n').filter(line => 
            !line.startsWith('Step "') && 
            !line.startsWith('QUESTION:') && 
            !line.startsWith('TYPE:')
          ).join('\n').trim();
          
          setExecutionProgress({
            currentStep: stepIndex + 1,
            totalSteps: updatedWorkflow.steps.length,
            result: rubricOnly
          });
        }
      );
      console.log('Workflow execution completed:', results);
      // Clean the final results as well
      const cleanResults = results.split('\n').filter(line => 
        !line.startsWith('Step "') && 
        !line.startsWith('QUESTION:') && 
        !line.startsWith('TYPE:')
      ).join('\n').trim();
      setRubric(cleanResults);
    } else {
      console.log('Generating rubric with custom prompt');
      const result = await generateRubric(image, prompt);
      console.log('Rubric generated:', result);
      setRubric(result);
    }
  } catch (error) {
    console.error('Error in handlePromptSubmit:', error);
    alert(error.message || 'Error in prompt submission. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

return (
  <>
    {!studentWorkspaceActive ? (
      <div className="workflow-layout">
        <div className="sidebar">
          <div className="sidebar-top">
            <div className="api-key-section card">
              {showApiKeyPrompt ? (
                <div>
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
                <button onClick={handleApiKeyRemove} className="remove-api-key-btn">
                  Remove API Key
                </button>
              )}
            </div>

            <div className={`image-upload-dropzone card ${!isKeySet ? 'disabled' : ''}`}>
              <ImageUpload onImageUpload={handleImageUpload} />
            </div>

            {isDetectingQuestion && (
              <div className="status-message">
                <span className="spinner">⏳</span>
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
          </div>

          <div className="sidebar-bottom">
            <div 
              ref={dropdownRef}
              className={`workflow-selector card ${showDropdown ? 'expanded' : ''}`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
            >
              <div className="workflow-selector-title">
                {selectedWorkflow ? selectedWorkflow.name : 'Select Workflow'}
                <span className="dropdown-arrow">▼</span>
              </div>

              {showDropdown && (
                <div 
                  className="workflow-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {workflows.map(wf => (
                    <div
                      key={wf.id}
                      className={`workflow-dropdown-item${selectedWorkflow && wf.id === selectedWorkflow.id ? ' selected' : ''}`}
                      onClick={() => {
                        handleWorkflowSelect(wf);
                        setShowDropdown(false);
                      }}
                    >
                      {wf.name}
                    </div>
                  ))}
                  <div 
                    className="workflow-dropdown-item create-new" 
                    onClick={() => {
                      handleCreateNewWorkflow();
                      setShowDropdown(false);
                    }}
                  >
                    <span>+</span> Create new
                  </div>
                </div>
              )}
            </div>

            <button 
              className={`run-workflow-btn ${!isKeySet ? 'disabled' : ''}`}
              onClick={handleWorkflowExecute}
              disabled={!isKeySet}
            >
              Run Workflow
            </button>
          </div>
        </div>
      </div>
    ) : (
      <StudentWorkspace
        rubric={rubric}
        question={detectedQuestion?.text}
        questionType={detectedQuestion?.type}
        format={detectedQuestion?.format}
        isActive={studentWorkspaceActive}
        onBack={() => setStudentWorkspaceActive(false)}
      />
    )}
  </>
);