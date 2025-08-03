import OpenAI from 'openai';

// Initialize the OpenAI client with the API key from localStorage
export const getOpenAIClient = () => {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Please set your API key first.');
  }
  
  // Validate API key format (should start with 'sk-' and be at least 32 characters)
  if (!apiKey.startsWith('sk-') || apiKey.length < 32) {
    throw new Error('Invalid OpenAI API key format. Please check your API key and try again.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, API calls should be made through a backend
  });
};

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

export const generateRubric = async (input, prompt) => {
  const openai = getOpenAIClient();
  
  try {
    // Check if input is a base64 image URL
    const isImageInput = typeof input === 'string' && input.startsWith('data:image/');
    
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant that analyzes educational questions and generates rubrics. For image inputs, first describe the question you see, then determine its type (multiple_choice, fill_in_the_blanks, true_false, matching, ordering, short_answer, or long_answer), and finally provide the requested analysis."
      }
    ];

    if (isImageInput) {
      // For image input, use GPT-4 Vision
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: prompt || "Extract the question from this image and determine its type."
          },
          {
            type: "image_url",
            image_url: {
              url: input,
              detail: "high"
            }
          }
        ]
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: messages,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } else {
      // For text input, use GPT-3.5 Turbo
      messages.push({
        role: "user",
        content: prompt || input
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    }
  } catch (error) {
    console.error('Error generating rubric:', error);
    if (error.message.includes('API key not found')) {
      throw new Error('OpenAI API key is required. Please add your API key in the settings.');
    }
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
  return generateRubric(textPrompt, null);
}; 