import { generateRubric, normalizeQuestionType } from './openaiService';

// Question type enumeration
export const QuestionType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_IN_THE_BLANKS: 'fill_in_the_blanks',
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',
  ORDERING: 'ordering',
  SHORT_ANSWER: 'short_answer',
  LONG_ANSWER: 'long_answer'
};

// Validate if a string matches a valid question type
const isValidQuestionType = (type) => {
  return Object.values(QuestionType).includes(type);
};

// Function to detect question type from text
export const detectQuestionType = async (text) => {
  const prompt = `Analyze the following question and determine its type. 
  Return ONLY the type in this exact format: TYPE: [type]
  Valid types are: ${Object.values(QuestionType).join(', ')}
  
  Question: ${text}`;

  console.log('Detecting question type with prompt:', prompt);
  const result = await generateRubric(prompt);
  console.log('Raw detection result:', result);

  const typeLine = result.split('\n').find(line => line.startsWith('TYPE:'));
  if (typeLine) {
    const extractedType = typeLine.replace('TYPE:', '').trim().toLowerCase();
    console.log('Extracted type:', extractedType);
    
    // Try to match with our enum values
    const matchingType = Object.entries(QuestionType).find(([_, value]) => {
      const normalizedExtracted = extractedType.replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
      const normalizedValue = value.toLowerCase();
      const matches = normalizedExtracted === normalizedValue;
      console.log('Comparing:', { 
        normalizedExtracted, 
        normalizedValue, 
        matches 
      });
      return matches;
    });

    if (matchingType) {
      console.log('Found matching type:', matchingType[1]);
      return matchingType[1]; // Return the exact enum value
    } else {
      console.log('No matching type found in enum:', QuestionType);
    }
  }
  
  console.log('Defaulting to short_answer');
  return QuestionType.SHORT_ANSWER;
};

// This data structure will work for both simple and visual versions
export const createWorkflow = () => ({
  id: Date.now().toString(),
  name: 'New Workflow',
  steps: [],
  connections: []
});

export const createStep = (type, prompt, model = 'gpt-4o', name = 'New Step') => ({
  id: Date.now().toString(),
  type,
  name,
  prompt,
  model,
  conditions: []
});

export const createCondition = (outputKey, operator, value, targetStepId) => ({
  id: Date.now().toString(),
  outputKey,
  operator,
  value,
  targetStepId
});

// Helper function to evaluate conditions
export const evaluateCondition = (condition, result) => {
  const { outputKey, operator, value } = condition;
  
  // Special case for 'exists' operator
  if (operator === 'exists') {
    return true;
  }

  // Handle both direct result and parsed result structures
  let typeToCheck = null;
  
  if (typeof result === 'object' && result.type) {
    typeToCheck = result.type;
  }

  // If we found a type to check
  if (typeToCheck) {
    // Normalize both the type to check and the condition value
    const normalizedTypeToCheck = normalizeQuestionType(typeToCheck);
    const normalizedValue = normalizeQuestionType(value);

    if (!normalizedTypeToCheck) {
      console.log('Invalid question type detected:', typeToCheck);
      return false;
    }

    // Only allow exact matching for question types
    if (operator === 'equals') {
      return normalizedTypeToCheck === normalizedValue;
    }
    
    return false;
  }

  const actualValue = result[outputKey] || '';

  switch (operator) {
    case 'equals':
      return actualValue === value;
    case 'contains':
      return actualValue.toLowerCase().includes(value.toLowerCase());
    case 'greaterThan':
      return parseFloat(actualValue) > parseFloat(value);
    case 'lessThan':
      return parseFloat(actualValue) < parseFloat(value);
    default:
      return false;
  }
};

// Function to get the next step based on conditions
export const getNextStep = (currentStep, aiOutput) => {
  console.log('=== Workflow Routing Debug ===');
  console.log('Current Step:', {
    id: currentStep.id,
    name: currentStep.name,
    conditions: currentStep.conditions
  });
  
  console.log('AI Output:', aiOutput);
  
  for (const condition of currentStep.conditions) {
    console.log('\nEvaluating condition:', {
      outputKey: condition.outputKey,
      operator: condition.operator,
      value: condition.value,
      targetStepId: condition.targetStepId
    });
    
    const matches = evaluateCondition(condition, aiOutput);
    console.log('Condition evaluation result:', matches);
    
    if (matches) {
      console.log('✅ MATCH FOUND - Routing to step:', condition.targetStepId);
      return condition.targetStepId;
    } else {
      console.log('❌ No match for this condition');
    }
  }
  
  console.log('=== No matching conditions found, using default next step ===');
  return null; // No matching condition found
};

// Helper function to clean response
const cleanResponse = (response) => {
  if (!response) return '';
  
  // Split into lines and filter out question, type, and format lines
  const lines = response.split('\n').filter(line => {
    const lowerLine = line.toLowerCase();
    return !lowerLine.startsWith('question:') &&
           !lowerLine.startsWith('type:') &&
           !lowerLine.startsWith('format:') &&
           line.trim() !== '';  // Remove empty lines
  });
  
  return lines.join('\n');
};

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

      // Don't pass the API key here, it's handled in generateRubric
      const result = await generateRubric(null, promptToUse);
      return cleanResponse(result);
    } else {
      // Linear mode: run all steps in order
      let lastResult = null;
      let context = { 
        text: questionText, 
        type: questionType,
        previous: null  // Track the previous step's full output
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

        // Get the full result for this step
        const result = await generateRubric(null, promptToUse);
        
        // Store the full result for the next step
        context.previous = result;
        
        // For progress updates, clean the result
        const cleanedResult = cleanResponse(result);
        if (onProgress) {
          onProgress(i, cleanedResult);
        }
        
        // Only store the last result
        lastResult = cleanedResult;
      }
      
      // Return only the final step's result
      return lastResult || '';
    }
  } catch (error) {
    console.error('Error in workflow execution:', error);
    throw error;
  }
}; 