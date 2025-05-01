// Question type enumeration
export const QuestionType = {
  SHORT_ANSWER: 'short_answer',
  LONG_ANSWER: 'long_answer',
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  FILL_IN_THE_BLANKS: 'fill_in_the_blanks',
  MATCHING: 'matching',
  ORDERING: 'ordering'
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
  const result = await generateRubricWithText(prompt);
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
  console.log('Raw condition evaluation input:', { condition, result });
  
  // Special case for 'exists' operator
  if (operator === 'exists') {
    return true; // Always true, used for terminal conditions
  }

  // Handle both direct result and parsed result structures
  let typeToCheck = null;
  
  if (typeof result === 'object') {
    // If we have a parsed result with type field
    if (result.type) {
      typeToCheck = result.type;
    }
    // If we have a result.result field (structured output)
    else if (result.result) {
      let cleanResult = result.result;
      
      // If the result is a JSON-style string, remove the outer quotes
      if (typeof cleanResult === 'string') {
        // Remove outer quotes if present
        if (cleanResult.startsWith('"') && cleanResult.endsWith('"')) {
          cleanResult = cleanResult.slice(1, -1);
          console.log('Removed outer quotes:', cleanResult);
        }
        
        // Remove triple backticks
        cleanResult = cleanResult.replace(/```/g, '').trim();
        console.log('Removed backticks:', cleanResult);
      }
      
      const lines = cleanResult.split('\n').map(line => line.trim()).filter(line => line);
      console.log('Split and cleaned lines:', lines);
      
      const typeLine = lines.find(l => l.startsWith('TYPE:'));
      if (typeLine) {
        typeToCheck = typeLine.replace('TYPE:', '').trim().toLowerCase();
      }
    }
  }

  // If we found a type to check
  if (typeToCheck) {
    console.log('Type to check:', typeToCheck);
    
    // Validate the type
    if (!isValidQuestionType(typeToCheck)) {
      console.log('Invalid question type detected:', typeToCheck);
      return false;
    }

    // For debugging, log the exact string comparison
    console.log('Comparison details:', {
      extractedType: typeToCheck,
      expectedValue: value,
      operator,
      typeLength: typeToCheck.length,
      valueLength: value.length,
      typeCharCodes: [...typeToCheck].map(c => c.charCodeAt(0)),
      valueCharCodes: [...value].map(c => c.charCodeAt(0))
    });

    // Only allow exact matching for question types
    if (operator === 'equals') {
      const exactMatch = typeToCheck === value.toLowerCase();
      console.log('Exact match result:', exactMatch);
      return exactMatch;
    }
    
    console.log('Invalid operator for question type comparison:', operator);
    return false;
  }

  console.log('Falling back to regular condition evaluation');
  const actualValue = result[outputKey] || '';
  console.log('Regular evaluation:', { actualValue, operator, value });

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

import { generateRubric, generateRubricWithText } from './openaiService';

const parseResult = (result) => {
  try {
    // Try to parse as JSON first
    return JSON.parse(result);
  } catch (e) {
    // If not JSON, try to extract key-value pairs
    const lines = result.split('\n');
    const parsed = {};
    lines.forEach(line => {
      const [key, ...values] = line.split(':').map(s => s.trim());
      if (key && values.length > 0) {
        parsed[key.toLowerCase()] = values.join(':').trim();
      }
    });
    return parsed;
  }
};

export const executeWorkflow = async (workflow, questionData, onProgress) => {
  console.log('=== Starting Workflow Execution ===');
  console.log('Workflow Configuration:', {
    name: workflow.name,
    totalSteps: workflow.steps.length,
    steps: workflow.steps.map(s => ({ 
      id: s.id, 
      name: s.name,
      conditions: s.conditions.map(c => ({
        outputKey: c.outputKey,
        operator: c.operator,
        value: c.value
      }))
    }))
  });
  
  if (!workflow || !workflow.steps || workflow.steps.length === 0) {
    throw new Error('Invalid workflow: no steps defined');
  }

  let questionText = '';
  let questionType = '';

  try {
    // Handle both image upload and existing question data
    if (typeof questionData === 'string') {
      questionText = questionData;
      console.log('Using existing question text:', questionText);
    } else if (typeof questionData === 'object') {
      questionText = questionData.text;
      questionType = questionData.type;
      console.log('Using provided question data:', { questionText, questionType });
    } else {
      throw new Error('Invalid question data provided');
    }
    
    if (!questionText) {
      throw new Error('Question text is empty');
    }

    // Check if any step has conditions
    const anyStepHasConditions = workflow.steps.some(step => step.conditions && step.conditions.length > 0);

    if (anyStepHasConditions) {
      // Conditional routing mode (original logic)
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
      const result = await generateRubricWithText(promptToUse);
      if (!result || typeof result !== 'string') {
        throw new Error('Invalid response from AI service');
      }
      return result;
    } else {
      // Linear mode: run all steps in order
      let results = [];
      let stepIndex = 0;
      let context = { text: questionText, type: questionType };
      let currentStepIndex = 0;
      let maxSteps = workflow.steps.length;
      let visitedSteps = new Set();

      while (currentStepIndex < maxSteps) {
        const step = workflow.steps[currentStepIndex];
        if (!step) break;
        if (visitedSteps.has(step.id)) break; // Prevent infinite loops
        visitedSteps.add(step.id);

        // Skip steps with empty or whitespace-only prompts
        if (!step.prompt || !step.prompt.trim()) {
          currentStepIndex++;
          continue;
        }

        let promptToUse = step.prompt
          .replace(/\{question\}/g, context.text)
          .replace(/\{type\}/g, context.type || '')
          .replace(/\{previous\}/g, context.previous || '');

        console.log(`[Workflow] Step ${currentStepIndex + 1} prompt:`, promptToUse);
        console.log(`[Workflow] Context:`, context);

        if (onProgress) {
          onProgress(currentStepIndex, `Running step: ${step.title || step.name}`);
        }

        const result = await generateRubricWithText(promptToUse);
        if (!result || typeof result !== 'string') {
          throw new Error('Invalid response from AI service');
        }
        results.push(result);

        // Update context for next step
        context = { ...context, text: result, previous: result };

        currentStepIndex++;
      }
      return results.join('\n');
    }
  } catch (error) {
    console.error('Error in workflow execution:', error);
    throw error;
  }
}; 