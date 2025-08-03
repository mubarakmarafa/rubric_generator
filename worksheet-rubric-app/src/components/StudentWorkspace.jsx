import React, { useState, useEffect, useRef } from 'react';
import { generateTutorFeedback } from '../services/aiTutorService';
import './StudentWorkspace.css';

const DEFAULT_PROMPTS = [
  {
    id: 1,
    name: 'Supportive Tutor',
    prompt: 'You are a encouraging AI tutor who helps students learn through guided discovery. Analyze the student\'s answer against the rubric criteria. Provide specific, constructive feedback that:\n- Acknowledges what they got right\n- Gently identifies areas for improvement\n- Offers hints or questions to guide them toward better understanding\n- Uses a warm, supportive tone that builds confidence',
    historyPrompt: 'Look at the student\'s previous attempts to understand their learning journey. Build upon earlier explanations, celebrate progress, and adjust your approach if they\'re struggling with the same concepts. If they\'re making repeated mistakes, try explaining the concept differently.'
  },
  {
    id: 2,
    name: 'Socratic Method',
    prompt: 'You are a Socratic tutor who guides students to discover answers through thoughtful questioning. Instead of giving direct answers, ask probing questions that help students think through the problem. Use the rubric to identify what they\'re missing, then craft questions that lead them to those insights.',
    historyPrompt: 'Review their previous responses to see what questions have been effective. If they\'ve answered your questions well, ask deeper ones. If they seem confused, break down your questions into simpler steps.'
  },
  {
    id: 3,
    name: 'Hint Provider',
    prompt: 'You are a helpful tutor who provides strategic hints without giving away the answer. Analyze what the student is missing based on the rubric, then give them just enough guidance to take the next step. Your hints should be specific enough to be helpful but vague enough to require thinking.',
    historyPrompt: 'Track what hints you\'ve already provided. If previous hints weren\'t helpful, try a different approach or provide more scaffolding. Gradually increase hint specificity if they continue to struggle.'
  }
];

export default function StudentWorkspace({ rubric, question, questionType, format, isActive, onBack }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('aiTutorPrompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });
  const [selectedPrompt, setSelectedPrompt] = useState(prompts[0]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(selectedPrompt.name);
  const [isFormView, setIsFormView] = useState(true);
  const [attemptHistory, setAttemptHistory] = useState(() => {
    const saved = localStorage.getItem('attemptHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('prompt'); // 'prompt' or 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [aiSettings, setAiSettings] = useState(() => {
    const saved = localStorage.getItem('aiTutorSettings');
    return saved ? JSON.parse(saved) : {
      tone: 'encouraging',
      languageLevel: 'intermediate', 
      responseStyle: 'detailed',
      difficultyLevel: 'standard',
      spokenLanguage: 'english'
    };
  });
  const dropdownRef = useRef(null);

  // Save prompts and history to localStorage when they change
  useEffect(() => {
    localStorage.setItem('aiTutorPrompts', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('attemptHistory', JSON.stringify(attemptHistory));
  }, [attemptHistory]);

  useEffect(() => {
    localStorage.setItem('aiTutorSettings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (!isActive) return null;

  const handleApiKeyRemove = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem('openai_api_key', newKey);
  };

  const handlePromptSelect = (prompt) => {
    setSelectedPrompt(prompt);
    setTitleInput(prompt.name);
    setShowDropdown(false);
  };

  const handleCreateNewPrompt = () => {
    const newPrompt = {
      id: Date.now(),
      name: 'New Prompt',
      prompt: '',
      historyPrompt: ''
    };
    setPrompts([...prompts, newPrompt]);
    setSelectedPrompt(newPrompt);
    setTitleInput(newPrompt.name);
    setShowDropdown(false);
    setEditingTitle(true);
  };

  const handleTitleClick = () => {
    if (apiKey) setEditingTitle(true);
  };

  const handleTitleChange = (e) => {
    setTitleInput(e.target.value);
  };

  const handleTitleBlur = () => {
    if (titleInput.trim() && titleInput !== selectedPrompt.name) {
      const updatedPrompts = prompts.map(p =>
        p.id === selectedPrompt.id ? { ...p, name: titleInput } : p
      );
      setPrompts(updatedPrompts);
      setSelectedPrompt({ ...selectedPrompt, name: titleInput });
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitleInput(selectedPrompt.name);
      setEditingTitle(false);
    }
  };

  const handlePromptChange = (field, value) => {
    const updatedPrompt = { ...selectedPrompt, [field]: value };
    const updatedPrompts = prompts.map(p =>
      p.id === selectedPrompt.id ? updatedPrompt : p
    );
    setPrompts(updatedPrompts);
    setSelectedPrompt(updatedPrompt);
  };



  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all attempt history?')) {
      setAttemptHistory([]);
      setFeedback(null);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || chatLoading || !apiKey) return;

    const userMessage = {
      role: 'student',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setChatLoading(true);

    try {
      // Build chat history for context
      const chatHistory = chatMessages.map(msg => ({
        answer: msg.role === 'student' ? msg.content : '',
        feedback: msg.role === 'ai-tutor' ? msg.content : ''
      }));

      const response = await generateTutorFeedback(
        question,
        rubric,
        userMessage.content,
        chatHistory,
        selectedPrompt.prompt,
        selectedPrompt.historyPrompt,
        questionType,
        format,
        aiSettings
      );

      const tutorMessage = {
        role: 'ai-tutor',
        content: response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, tutorMessage]);
    } catch (error) {
      console.error('Error getting tutor response:', error);
      const errorMessage = {
        role: 'ai-tutor',
        content: 'Sorry, I encountered an error. Please check your API key and try again.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="student-workspace-layout">
      {/* Student Workspace Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          {/* API Key Section */}
          <div className="api-key-section card">
            {apiKey ? (
              <button onClick={handleApiKeyRemove} className="remove-api-key-btn">
                Remove API Key
              </button>
            ) : (
              <div>
                <h3>API Key</h3>
                <input
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Enter your API key"
                  className="api-key-input"
                />
              </div>
            )}
          </div>

          {/* Question and Metadata Section */}
          <div className="question-section card">
            <h3>📝 Question & Metadata</h3>
            <div className="question-content">
              <div className="question-text">
                <strong>Question:</strong>
                <p>{question || 'No question available'}</p>
              </div>
              {questionType && (
                <div className="question-meta">
                  <span className="meta-item">
                    <strong>Type:</strong> {questionType}
                  </span>
                  {format && (
                    <span className="meta-item">
                      <strong>Format:</strong> {format}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rubric Section */}
          <div className="rubric-section card">
            <h3>📋 Rubric Criteria</h3>
            <div className="rubric-content">
              {rubric ? (
                <pre className="rubric-text">{rubric}</pre>
              ) : (
                <p className="no-rubric">No rubric available</p>
              )}
            </div>
          </div>


        </div>

        {/* AI Tutor Selector */}
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
              {selectedPrompt ? selectedPrompt.name : 'Select Prompt'}
              <span className="dropdown-arrow">▼</span>
            </div>

            {showDropdown && (
              <div 
                className="workflow-dropdown open-to-middle"
                onClick={(e) => e.stopPropagation()}
              >
                {prompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className={`workflow-dropdown-item${selectedPrompt && prompt.id === selectedPrompt.id ? ' selected' : ''}`}
                    onClick={() => {
                      handlePromptSelect(prompt);
                      setShowDropdown(false);
                    }}
                  >
                    {prompt.name}
                  </div>
                ))}
                <div 
                  className="workflow-dropdown-item create-new" 
                  onClick={() => {
                    handleCreateNewPrompt();
                    setShowDropdown(false);
                  }}
                >
                  <span>+</span> Create new
                </div>
              </div>
            )}
          </div>

          {/* Back to Rubric Workspace Button */}
          <button
            onClick={onBack}
            className="back-to-rubric-btn"
            style={{
              marginTop: '1rem',
              width: '100%',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            ← Back to Rubric Workspace
          </button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="main-panel">
        <div className="main-panel-header">
          <div className="workflow-title-row">
            {editingTitle ? (
              <input
                className="workflow-title-input"
                value={titleInput}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                maxLength={40}
              />
            ) : (
              <h2 className="workflow-title" onClick={handleTitleClick} tabIndex={0}>
                🎓 {selectedPrompt.name}
              </h2>
            )}
            <p className="system-prompt-subtitle">Configure how the AI tutor should respond to students</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompt')}
            >
              📝 Prompt Configuration
            </button>
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat Simulation
            </button>
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'prompt' ? (
            <div className="prompt-tab">
              <div className="workflow-steps-scroll">
                <div className="workflow-steps">
                  {/* Data Being Used Section */}
                  <div className="workflow-step step-card data-summary">
                    <div className="step-card-row">
                      <h3>📊 Data Context (Auto-included)</h3>
                    </div>
                    <div className="data-context-info">
                      <p><strong>The AI tutor will automatically receive:</strong></p>
                      <ul>
                        <li>✅ Question: {question ? `"${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"` : 'Not available'}</li>
                        <li>✅ Question Type: {questionType || 'Not specified'}</li>
                        <li>✅ Question Format: {format || 'Not specified'}</li>
                        <li>✅ Rubric Criteria: {rubric ? 'Available' : 'Not available'}</li>
                        <li>✅ Student's Answer: Will be provided during chat</li>
                        <li>✅ Previous Conversation: Chat history included</li>
                      </ul>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="workflow-step step-card">
                    <div className="step-card-row">
                      <h3>🎯 AI Tutor System Prompt</h3>
                      <p className="prompt-description">Define how the AI tutor should behave and respond to students</p>
                    </div>
                    <textarea
                      className="step-prompt-input"
                      value={selectedPrompt.prompt}
                      onChange={(e) => handlePromptChange('prompt', e.target.value)}
                      placeholder="Example: You are a helpful AI tutor. Provide encouraging feedback that guides students toward the correct answer. Focus on understanding their thinking and offering constructive suggestions..."
                      rows={8}
                    />
                  </div>

                  {/* History Handling */}
                  <div className="workflow-step step-card">
                    <div className="step-card-row">
                      <h3>🔄 Conversation History Instructions</h3>
                      <p className="prompt-description">How should the tutor use previous attempts and feedback?</p>
                    </div>
                    <textarea
                      className="step-prompt-input"
                      value={selectedPrompt.historyPrompt}
                      onChange={(e) => handlePromptChange('historyPrompt', e.target.value)}
                      placeholder="Example: Review the student's previous attempts and build upon earlier explanations. Track their progress and adjust your guidance accordingly. If they're making the same mistakes, try a different approach..."
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-tab">
              <div className="chat-container">
                <div className="chat-header">
                  <h3>💬 Chat with AI Tutor</h3>
                  <p>Simulate a student conversation with the AI tutor using your configured prompts</p>
                  {chatMessages.length > 0 && (
                    <button 
                      onClick={() => setChatMessages([])}
                      className="clear-chat-btn"
                    >
                      Clear Chat
                    </button>
                  )}
                </div>
                
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className="empty-chat-icon">🤖</div>
                      <h4>Start a conversation!</h4>
                      <p>Type a student question or answer below to begin chatting with the AI tutor.</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className={`chat-message ${message.role}`}>
                        <div className="message-avatar">
                          {message.role === 'student' ? '👨‍🎓' : '🤖'}
                        </div>
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="chat-message ai-tutor">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="chat-input">
                  <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type your message as a student..."
                    rows={2}
                    disabled={chatLoading || !apiKey}
                  />
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    disabled={chatLoading}
                    className="settings-btn"
                    title="AI Response Settings"
                  >
                    ⚙️
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || chatLoading || !apiKey}
                    className="send-btn"
                  >
                    Send
                  </button>
                </div>
                
                {!apiKey && (
                  <div className="chat-warning">
                    ⚠️ Please set your OpenAI API key in the left panel to use the chat feature.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 AI Response Settings</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowSettingsModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="settings-description">
                Customize how the AI tutor responds to student questions and answers.
              </p>
              
              <div className="settings-grid">
                <div className="setting-group">
                  <label htmlFor="tone-select">Tone of Voice</label>
                  <select 
                    id="tone-select"
                    value={aiSettings.tone}
                    onChange={(e) => setAiSettings(prev => ({...prev, tone: e.target.value}))}
                    className="setting-select"
                  >
                    <option value="encouraging">Encouraging & Supportive</option>
                    <option value="professional">Professional & Formal</option>
                    <option value="friendly">Friendly & Casual</option>
                    <option value="direct">Direct & Concise</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label htmlFor="language-level-select">Language Level</label>
                  <select 
                    id="language-level-select"
                    value={aiSettings.languageLevel}
                    onChange={(e) => setAiSettings(prev => ({...prev, languageLevel: e.target.value}))}
                    className="setting-select"
                  >
                    <option value="beginner">Beginner (Simple language)</option>
                    <option value="intermediate">Intermediate (Standard language)</option>
                    <option value="advanced">Advanced (Technical language)</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label htmlFor="style-select">Response Style</label>
                  <select 
                    id="style-select"
                    value={aiSettings.responseStyle}
                    onChange={(e) => setAiSettings(prev => ({...prev, responseStyle: e.target.value}))}
                    className="setting-select"
                  >
                    <option value="detailed">Detailed explanations</option>
                    <option value="concise">Concise & to the point</option>
                    <option value="step-by-step">Step-by-step guidance</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label htmlFor="difficulty-select">Difficulty Level</label>
                  <select 
                    id="difficulty-select"
                    value={aiSettings.difficultyLevel}
                    onChange={(e) => setAiSettings(prev => ({...prev, difficultyLevel: e.target.value}))}
                    className="setting-select"
                  >
                    <option value="simplified">Simplified (More hints)</option>
                    <option value="standard">Standard (Balanced)</option>
                    <option value="challenging">Challenging (Minimal hints)</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label htmlFor="spoken-language-select">Response Language</label>
                  <select 
                    id="spoken-language-select"
                    value={aiSettings.spokenLanguage}
                    onChange={(e) => setAiSettings(prev => ({...prev, spokenLanguage: e.target.value}))}
                    className="setting-select"
                  >
                    <option value="english">English</option>
                    <option value="spanish">Español (Spanish)</option>
                    <option value="chinese">中文 (Chinese)</option>
                    <option value="french">Français (French)</option>
                    <option value="german">Deutsch (German)</option>
                    <option value="japanese">日本語 (Japanese)</option>
                    <option value="pirate">🏴‍☠️ Pirate Speech (Easter Egg!)</option>
                    <option value="emoji">🎉 Emojis Only (Easter Egg!)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn primary"
                onClick={() => setShowSettingsModal(false)}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 