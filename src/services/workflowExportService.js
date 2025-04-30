// Service for handling workflow export and import operations

/**
 * Exports a workflow to a JSON file
 * @param {Object} workflow - The workflow to export
 * @param {string} filename - The name of the file to save (without extension)
 */
export const exportWorkflow = (workflow, filename = 'workflow') => {
  console.log('Exporting workflow:', workflow);
  
  // Add metadata to the workflow
  const exportData = {
    ...workflow,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      app: 'Worksheet Rubric Generator'
    }
  };

  console.log('Export data:', exportData);

  // Create and download the file
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `${filename}.json`;
  
  console.log('Creating download link for:', exportFileDefaultName);
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

/**
 * Validates an imported workflow
 * @param {Object} workflow - The workflow to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateWorkflow = (workflow) => {
  console.log('Validating workflow:', workflow);
  const errors = [];

  // Check required fields
  if (!workflow.id) errors.push('Missing workflow ID');
  if (!workflow.name) errors.push('Missing workflow name');
  if (!workflow.steps || !Array.isArray(workflow.steps)) {
    errors.push('Invalid or missing steps array');
  } else {
    // Validate each step
    workflow.steps.forEach((step, index) => {
      if (!step.id) errors.push(`Step ${index + 1} missing ID`);
      if (!step.name) errors.push(`Step ${index + 1} missing name`);
      if (!step.prompt) errors.push(`Step ${index + 1} missing prompt`);
      if (!step.conditions || !Array.isArray(step.conditions)) {
        errors.push(`Step ${index + 1} has invalid conditions`);
      }
    });
  }

  console.log('Validation result:', { isValid: errors.length === 0, errors });
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Imports a workflow from a file
 * @param {File} file - The file to import
 * @returns {Promise<Object>} - The imported workflow
 */
export const importWorkflow = (file) => {
  console.log('Importing file:', file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        console.log('File read complete, parsing JSON...');
        const workflow = JSON.parse(event.target.result);
        console.log('Parsed workflow:', workflow);
        const validation = validateWorkflow(workflow);
        
        if (!validation.isValid) {
          console.error('Validation failed:', validation.errors);
          reject(new Error(`Invalid workflow: ${validation.errors.join(', ')}`));
          return;
        }
        
        console.log('Import successful');
        resolve(workflow);
      } catch (error) {
        console.error('Import failed:', error);
        reject(new Error('Failed to parse workflow file'));
      }
    };
    
    reader.onerror = (error) => {
      console.error('File read error:', error);
      reject(new Error('Failed to read workflow file'));
    };
    
    reader.readAsText(file);
  });
}; 