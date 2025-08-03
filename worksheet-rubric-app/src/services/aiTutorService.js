import { getOpenAIClient } from './openaiService';

// Structure for storing attempt history
export const createAttempt = (answer, feedback, promptId) => ({
  id: Date.now(),
  timestamp: new Date().toISOString(),
  answer,
  feedback,
  promptId
});

// Function to generate AI tutor feedback
export const generateTutorFeedback = async (
  question,
  rubric,
  answer,
  attemptHistory,
  mainPrompt,
  historyPrompt,
  questionType = null,
  questionFormat = null,
  aiSettings = null
) => {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const openai = getOpenAIClient(apiKey);
  
  // Build conversation history context
  const historyContext = attemptHistory.length > 0
    ? `Previous attempts:\n${attemptHistory.map((attempt, index) => 
        `Attempt ${index + 1}:\nAnswer: ${attempt.answer}\nFeedback: ${attempt.feedback}\n`
      ).join('\n')}`
    : 'This is the first attempt.';

  // Build AI settings context
  const settingsContext = aiSettings ? `
RESPONSE CUSTOMIZATION:
- Tone: ${getToneInstruction(aiSettings.tone)}
- Language Level: ${getLanguageLevelInstruction(aiSettings.languageLevel)}
- Response Style: ${getResponseStyleInstruction(aiSettings.responseStyle)}
- Difficulty Level: ${getDifficultyLevelInstruction(aiSettings.difficultyLevel)}
- Response Language: ${getSpokenLanguageInstruction(aiSettings.spokenLanguage)}

Please adapt your response according to these settings while maintaining educational effectiveness.` : '';

  // Debug logging to verify settings are being applied
  console.log('AI Settings being applied:', aiSettings);
  console.log('Settings context:', settingsContext);

  // Debug: Log the full system prompt
  const systemPrompt = `${mainPrompt}

QUESTION DATA:
Question: ${question}
Type: ${questionType || 'Not specified'}
Format: ${questionFormat || 'Not specified'}

RUBRIC CRITERIA:
${rubric}

CONVERSATION HISTORY INSTRUCTIONS:
${historyPrompt}

CURRENT CONTEXT:
${historyContext}
${settingsContext}

Remember: Provide educational feedback that helps the student learn while following the rubric criteria above.`;

  console.log('Full system prompt:', systemPrompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Here is my answer to the question: ${answer}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating tutor feedback:', error);
    throw error;
  }
};

// Function to determine if student should be directed to teacher
export const shouldDirectToTeacher = (history, maxAttempts = 3) => {
  if (history.length >= maxAttempts) {
    // Check if the last few attempts show no improvement
    const recentAttempts = history.slice(-maxAttempts);
    const allIncorrect = recentAttempts.every(attempt => 
      attempt.feedback.toLowerCase().includes('incorrect') || 
      attempt.feedback.toLowerCase().includes('not quite')
    );
    return allIncorrect;
  }
  return false;
};

// Helper functions for AI settings instructions
const getToneInstruction = (tone) => {
  const instructions = {
    encouraging: 'Use an encouraging, positive, and supportive tone. Celebrate progress and motivate the student.',
    professional: 'Use a professional, formal tone. Be respectful and maintain academic standards.',
    friendly: 'Use a friendly, casual, and approachable tone. Be conversational and warm.',
    direct: 'Use a direct, concise tone. Get straight to the point without unnecessary elaboration.'
  };
  return instructions[tone] || instructions.encouraging;
};

const getLanguageLevelInstruction = (level) => {
  const instructions = {
    beginner: 'Use simple, clear language. Avoid technical jargon and explain concepts in basic terms.',
    intermediate: 'Use standard academic language appropriate for the grade level. Balance clarity with precision.',
    advanced: 'Use sophisticated vocabulary and technical terms when appropriate. Assume higher linguistic competency.'
  };
  return instructions[level] || instructions.intermediate;
};

const getResponseStyleInstruction = (style) => {
  const instructions = {
    detailed: 'Provide detailed explanations with thorough reasoning and multiple examples when helpful.',
    concise: 'Keep responses brief and focused. Provide only essential information and key points.',
    'step-by-step': 'Break down concepts into clear, sequential steps. Use numbered or bulleted lists when appropriate.'
  };
  return instructions[style] || instructions.detailed;
};

const getDifficultyLevelInstruction = (level) => {
  const instructions = {
    simplified: 'Provide more guidance and hints. Break down complex problems into smaller, manageable parts.',
    standard: 'Provide balanced guidance. Give appropriate hints without giving away the answer completely.',
    challenging: 'Provide minimal direct hints. Encourage independent thinking and problem-solving.'
  };
  return instructions[level] || instructions.standard;
};

const getSpokenLanguageInstruction = (language) => {
  const instructions = {
    english: 'Respond in English.',
    spanish: 'Respond in Spanish (Español). Use clear, educational Spanish appropriate for the student\'s level.',
    chinese: 'Respond in Simplified Chinese (简体中文). Use clear, educational Chinese appropriate for the student\'s level.',
    french: 'Respond in French (Français). Use clear, educational French appropriate for the student\'s level.',
    german: 'Respond in German (Deutsch). Use clear, educational German appropriate for the student\'s level.',
    japanese: 'Respond in Japanese (日本語). Use clear, educational Japanese appropriate for the student\'s level.',
    pirate: 'SPECIAL MODE: Respond like a pirate tutor! Use pirate speech with "ahoy", "matey", "ye", "aye", "arr", "savvy?", "shiver me timbers", etc. Be educational but speak like a friendly pirate captain teaching their crew. Replace "you" with "ye", "your" with "yer", "my" with "me", etc. End sentences with "arr!" or "savvy?" occasionally. Make learning an adventure on the high seas!',
    emoji: 'EMOJI-ONLY MODE: You MUST respond using ONLY emojis - absolutely NO words, letters, or text allowed! Not even "a", "I", "the", or any single letters. Use ONLY emoji characters: 😀🔥📚✅❌🤔💭🎯📝➡️⬅️⬆️⬇️🔄💪🎉👍👎🏆⭐🌟💡🔍📊📈📉➕➖✖️➗🔢🎲🎨🔬🌍🚀. Communicate educational feedback, encouragement, and guidance through creative emoji combinations and sequences. NO TEXT WHATSOEVER - violating this rule is strictly forbidden!'
  };
  return instructions[language] || instructions.english;
}; 