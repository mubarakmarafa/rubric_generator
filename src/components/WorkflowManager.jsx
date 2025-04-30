import React, { useState, useEffect } from 'react';
import { exportWorkflow, importWorkflow } from '../services/workflowExportService';

const WorkflowManager = ({ workflows, onWorkflowSelect, onWorkflowDelete, onWorkflowEdit }) => {
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSteps, setEditSteps] = useState([]);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    if (editingWorkflow) {
      setEditName(editingWorkflow.name);
      setEditSteps([...editingWorkflow.steps]);
    }
  }, [editingWorkflow]);

  const handleExport = (workflow) => {
    exportWorkflow(workflow, workflow.name);
  };

  const handleImport = async (event) => {
    console.log('Import handler triggered');
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name);
    try {
      const importedWorkflow = await importWorkflow(file);
      console.log('Imported workflow:', importedWorkflow);
      onWorkflowEdit(importedWorkflow);
      setImportError(null);
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message);
    }
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      alert('Please enter a workflow name');
      return;
    }
    if (editSteps.length === 0) {
      alert('Please add at least one step to the workflow');
      return;
    }
    onWorkflowEdit({
      ...editingWorkflow,
      name: editName,
      steps: editSteps
    });
    setEditingWorkflow(null);
  };

  const handleAddStep = () => {
    setEditSteps([...editSteps, {
      id: Date.now().toString(),
      name: '',
      prompt: '',
      conditions: []
    }]);
  };

  const handleUpdateStep = (stepId, updates) => {
    setEditSteps(editSteps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleAddCondition = (stepId) => {
    setEditSteps(editSteps.map(step => {
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
    setEditSteps(editSteps.map(step => {
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

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Manage Workflows</h2>
      
      {importError && (
        <div style={{ 
          color: 'red', 
          marginBottom: '1rem',
          padding: '0.5rem',
          border: '1px solid red',
          borderRadius: '4px'
        }}>
          {importError}
        </div>
      )}

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <label
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Import Workflow
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      {editingWorkflow ? (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Edit Workflow</h3>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Workflow name"
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
          
          {editSteps.map((step, index) => (
            <div key={step.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>Step {index + 1}</span>
                <button
                  onClick={() => setEditSteps(editSteps.filter(s => s.id !== step.id))}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete Step
                </button>
              </div>
              
              <input
                type="text"
                value={step.name}
                onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
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
                value={step.prompt}
                onChange={(e) => handleUpdateStep(step.id, { prompt: e.target.value })}
                placeholder="Step prompt"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              
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
                        {editSteps
                          .filter(s => s.id !== step.id)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name || `Step ${editSteps.indexOf(s) + 1}`}
                            </option>
                          ))}
                      </select>
                      
                      <button
                        onClick={() => handleUpdateStep(step.id, {
                          conditions: step.conditions.filter(c => c.id !== condition.id)
                        })}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
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
          ))}
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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
            
            <button
              onClick={handleSaveEdit}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
            
            <button
              onClick={() => setEditingWorkflow(null)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {workflows.length === 0 ? (
            <p>No workflows saved yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {workflows.map(workflow => (
                <div 
                  key={workflow.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{workflow.name}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => onWorkflowSelect(workflow)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Use
                    </button>
                    <button
                      onClick={() => setEditingWorkflow(workflow)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleExport(workflow)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => onWorkflowDelete(workflow.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowManager; 