// All AI calls are proxied through the serverless endpoint to avoid exposing secrets
const postChat = async ({ messages, model = 'gpt-4.1-mini', temperature = 0.7, max_tokens = 2000 }) => {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, temperature, max_tokens })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Request failed with ${resp.status}`);
  }
  const data = await resp.json();
  return data;
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

export const normalizeQuestionType = (type) => {
  if (!type) return null;
  
  // Convert to lowercase and remove special characters
  const normalized = type.toLowerCase()
    .replace(/[\/\\-]/g, '_')  // Replace slashes and hyphens with underscores
    .replace(/\s+/g, '_')      // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, ''); // Remove any other special characters
  
  // Check if the normalized type is valid
  if (VALID_QUESTION_TYPES.includes(normalized)) {
    return normalized;
  }
  
  // Try to match common variations
  const typeVariations = {
    'mcq': 'multiple_choice',
    'multiplechoice': 'multiple_choice',
    'fillintheblanks': 'fill_in_the_blanks',
    'fillinblank': 'fill_in_the_blanks',
    'fillintheblank': 'fill_in_the_blanks',
    'truefalse': 'true_false',
    'tf': 'true_false',
    'true_or_false': 'true_false',
    'shortanswer': 'short_answer',
    'short': 'short_answer',
    'longanswer': 'long_answer',
    'long': 'long_answer',
    'essay': 'long_answer'
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

  try {
    // Check if input is a base64 image URL
    const isImageInput = typeof input === 'string' && input.startsWith('data:image/');
    
    if (isImageInput) {
      const messages = [
        {
          role: "system",
          content: "You are a direct and precise assistant that analyzes educational questions from images. Extract ONLY the question text and determine its type. Format your response EXACTLY as:\nQuestion: [extracted question]\nType: [question type]\nFormat: [any specific format instructions]"
        },
        {
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
        }
      ];

      const { content } = await postChat({
        model: "gpt-4.1",
        messages,
        max_tokens: 1000
      });
      return content;
    } else {
      // For text input, use the regular rubric generation
      const messages = [
        {
          role: "system",
          content: "You are a direct and concise rubric generator. Provide ONLY the rubric content without any explanations, introductions, or additional text. Format the rubric exactly as requested without any extra commentary. Do not include phrases like 'Here's the rubric' or 'I hope this helps'. Just output the rubric content directly."
        },
        {
          role: "user",
          content: typeof input === 'object' && input !== null
            ? `Generate a detailed rubric for grading the following question: ${input.text}
Question type: ${input.type}
Please include specific criteria and point values.`
            : prompt // If input is null or not an object, use the prompt directly
        }
      ];

      const { content } = await postChat({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });
      return content;
    }
  } catch (error) {
    console.error('Error in generateRubric:', error);
    throw error;
  }
};

export const generateRubricWithText = async (textPrompt) => {
  try {
    const { content } = await postChat({
      model: "gpt-4.1-mini",
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
    return content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error.message.includes('API key not found')) {
      throw error; // Re-throw API key errors
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

export const executeWorkflowStep = async (step, context) => {
  try {
    const messages = [
      {
        role: "system",
        content: "You are a direct and precise assistant. Provide ONLY the requested output without any explanations, introductions, or additional commentary. Do not include phrases like 'Here's the result' or 'I hope this helps'. Output exactly what is asked for and nothing more."
      },
      {
        role: "user",
        content: `Context: ${JSON.stringify(context)}\n\n${step.prompt}`
      }
    ];

    const { content } = await postChat({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000
    });
    return content;
  } catch (error) {
    console.error('Error in executeWorkflowStep:', error);
    throw error;
  }
} 