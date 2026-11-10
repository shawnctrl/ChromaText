import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from client folder
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.post('/api/analyze', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text content is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[-] Missing GEMINI_API_KEY in server environment.');
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing on the server env.' });
  }

  console.log('[+] Processing analysis request via Gemini 3.8 Flash...');

  const prompt = `
You are an AI linguistic and visual color analysis system.
Analyze the provided text for:
1. Context-aware visual word colorization: Identify specific nouns, adjectives, or imagery words that evoke explicit colors in context (e.g., "sky" -> "#38bdf8", "ocean" -> "#0284c7", "shadow" -> "#64748b", "gold" -> "#f59e0b", "winter" -> "#f8fafc").
   CRITICAL CONTEXT RULE: Do NOT assign color hex values to emotion idioms (e.g., in "felt blue", "blue" is an emotion, NOT a physical color word).
2. Sentence-level emotion detection: Detect sentence emotions ("joy", "sadness", "anger", "fear", "serenity", or "neutral") and select an appropriate pastel accent hex color for sentence highlights.

Return STRICT JSON matching this schema:
{
  "sentences": [
    {
      "sentenceText": "exact original sentence text",
      "emotion": "joy | sadness | anger | fear | serenity | neutral",
      "emotionColor": "#hexColorForEmotionBackground"
    }
  ],
  "wordColors": [
    {
      "word": "exact word to highlight",
      "hexColor": "#hexColorCode"
    }
  ]
}

Text to analyze:
${text}
`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    // 60-second timeout via axios to handle slower cold starts
    const response = await axios.post(
      geminiUrl,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const rawAiOutput = response.data.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(rawAiOutput);

    console.log('[+] Analysis completed successfully!');
    res.json(parsedData);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('[-] Request timed out after 60 seconds.');
      return res.status(504).json({ error: 'Request to Gemini API timed out.' });
    }
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error('[-] Server AI Processing Error:', errorMessage);
    res.status(500).json({ error: 'Failed to analyze text using AI.', details: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server running safely on http://localhost:${PORT}`);
});