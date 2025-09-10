import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.LITELLM_BASE_URL || process.env.OPENAI_BASE_URL || undefined;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing API key. Set LITELLM_API_KEY or OPENAI_API_KEY.' });
    }

    const { messages, model = 'gpt-4.1-mini', temperature = 0.7, max_tokens = 2000 } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: messages array is required.' });
    }

    const client = new OpenAI({ apiKey, baseURL });

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    const content = completion?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ content, raw: completion });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const status = error?.status || 500;
    return res.status(status).json({ error: error?.message || 'Unknown error' });
  }
}



