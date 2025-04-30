import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development, in production this should be handled by a backend
});

const VALID_QUESTION_TYPES = [
  'multiple_choice',
  'fill_in_the_blanks',
  'true_false',
  'matching',
  'ordering',
  'short_answer',
  'long_answer'
];

const normalizeQuestionType = (type) => {
  if (!type) return null;
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = type.toLowerCase().replace(/\s+/g, '_');
  
  // Check if the normalized type is valid
  if (VALID_QUESTION_TYPES.includes(normalized)) {
    return normalized;
  }
  
  // Try to match common variations
  const typeVariations = {
    'mcq': 'multiple_choice',
    'multiplechoice': 'multiple_choice',
    'fillintheblanks': 'fill_in_the_blanks',
    'truefalse': 'true_false',
    'tf': 'true_false',
    'shortanswer': 'short_answer',
    'longanswer': 'long_answer'
  };
  
  return typeVariations[normalized] || null;
};

export const validateQuestionType = (type) => {
  const normalizedType = normalizeQuestionType(type);
  if (!normalizedType) {
    console.warn(`Invalid question type detected: ${type}`);
    return null;
  }
  return normalizedType;
};

export const generateRubric = async (imageData, prompt) => {
  try {
    if (!imageData) {
      throw new Error('No image data provided');
    }

    if (!imageData.startsWith('data:image/')) {
      throw new Error('Invalid image data format');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Analyze this question image carefully, considering both the text content AND the visual format. Pay special attention to:

1. Multiple Choice Indicators:
   - Lettered options (A, B, C, D, etc.)
   - Bullet points or numbered options
   - Checkboxes or circles for selection
   - Words like "choose", "select", "which of the following"

2. Fill in the Blanks Indicators:
   - Underscores or blank spaces
   - Words like "fill in", "complete", "missing"
   - Parentheses or brackets for missing words

3. True/False Indicators:
   - T/F or True/False labels
   - Checkboxes or circles for selection
   - Statements that can be verified as true or false

4. Matching Indicators:
   - Two columns of items
   - Lines or spaces for connecting items
   - Words like "match", "connect", "pair"

5. Ordering Indicators:
   - Numbered steps or sequences
   - Words like "order", "sequence", "arrange"
   - Steps or stages to be ordered

${prompt}

Please format your response exactly like this:
QUESTION: [exact question from image]
FORMAT: [describe the visual format with specific details, e.g., "Multiple choice with 4 options: A) Nucleus, B) Chloroplast, C) Mitochondria, D) Vacuole"]
TYPE: [one of: multiple_choice, fill_in_the_blanks, true_false, matching, ordering, short_answer, long_answer]

Do not include any other text or explanations.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    const content = response.choices[0].message.content;
    
    // Parse the response
    const questionMatch = content.match(/QUESTION:\s*(.+)/);
    const formatMatch = content.match(/FORMAT:\s*(.+)/);
    const typeMatch = content.match(/TYPE:\s*(.+)/);
    
    if (!questionMatch || !formatMatch || !typeMatch) {
      throw new Error('Invalid response format from OpenAI API');
    }
    
    const question = questionMatch[1].trim();
    const format = formatMatch[1].trim();
    const detectedType = typeMatch[1].trim();
    
    // Validate and normalize the question type
    const validatedType = validateQuestionType(detectedType);
    
    return {
      question,
      format,
      type: validatedType
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
    }
    throw error;
  }
};

export const generateRubricWithText = async (textPrompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt }
          ]
        }
      ],
      max_tokens: 1000
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
    }
    throw error;
  }
}; 