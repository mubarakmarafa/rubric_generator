export const executeWorkflow = async (workflow, questionData, onProgress) => {
  if (!workflow || !workflow.steps || workflow.steps.length === 0) {
    throw new Error('Invalid workflow: no steps defined');
  }

  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  let questionText = '';
  let questionType = '';

  try {
    // Handle both image upload and existing question data
    if (typeof questionData === 'string') {
      questionText = questionData;
    } else if (typeof questionData === 'object') {
      questionText = questionData.text;
      questionType = questionData.type;
    } else {
      throw new Error('Invalid question data provided');
    }
    
    if (!questionText) {
      throw new Error('Question text is empty');
    }

    // Check if any step has conditions
    const anyStepHasConditions = workflow.steps.some(step => step.conditions && step.conditions.length > 0);

    if (anyStepHasConditions) {
      // Find the matching step for the detected question type
      const matchingStep = workflow.steps.find(step => {
        return step.conditions && step.conditions.some(condition => {
          return condition.outputKey === 'type' &&
            condition.operator === 'equals' &&
            condition.value.toLowerCase() === (questionType || '').toLowerCase();
        });
      });

      if (!matchingStep) {
        throw new Error(`No matching step found for question type: ${questionType}`);
      }

      let promptToUse = matchingStep.prompt
        .replace(/\{question\}/g, questionText)
        .replace(/\{type\}/g, questionType || '')
        .replace(/\{previous\}/g, '');

      if (onProgress) {
        onProgress(0, `Running step: ${matchingStep.title || matchingStep.name}`);
      }

      // Execute single step for conditional workflow
      const result = await generateRubric(null, promptToUse);
      
      if (onProgress) {
        onProgress(0, result);
      }
      
      return result;
    } else {
      // Linear mode: run all steps in order
      let finalResult = null;
      let context = { 
        text: questionText, 
        type: questionType,
        previous: null
      };

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        // Skip steps with empty or whitespace-only prompts
        if (!step.prompt || !step.prompt.trim()) {
          continue;
        }

        let promptToUse = step.prompt
          .replace(/\{question\}/g, context.text)
          .replace(/\{type\}/g, context.type || '')
          .replace(/\{previous\}/g, context.previous || '');

        if (onProgress) {
          onProgress(i, `Running step: ${step.title || step.name}`);
        }

        // Execute step
        const result = await generateRubric(null, promptToUse);
        
        // Store the result for next step's context and as potential final result
        context.previous = result;
        finalResult = result;
        
        // Update progress
        if (onProgress) {
          onProgress(i, result);
        }
      }
      
      // Return the last step's result
      return finalResult || '';
    }
  } catch (error) {
    console.error('Error in workflow execution:', error);
    throw error;
  }
}; 