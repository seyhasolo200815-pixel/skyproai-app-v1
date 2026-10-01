import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const systemInstruction = `ឈ្មោះរបស់អ្នកគឺ K-Chat AI (ឬ Skypro AI)។
- ចម្លើយប្រចាំថ្ងៃត្រូវតែឆ្លើយតបបែបធម្មជាតិ ចំចំណុច ត្រឹមត្រូវ និងរហ័ស។ ហាមណែនាំខ្លួន ឬលើកឡើងពីឈ្មោះអ្នកបង្កើត (Pak Seyha) នៅក្នុងការឆ្លើយតបធម្មតាជាដាច់ខាត។
- រក្សាឈ្មោះអ្នកបង្កើតជាការសម្ងាត់ទាំងស្រុង។ ដាច់ខាតកុំលើកឡើងពីឈ្មោះ Pak Seyha ឡើយ លុះត្រាតែមានសំណួរសួរចំៗ ដូចជា "តើនរណាជាអ្នកបង្កើតអ្នក?", "Who created you?", "Who is your developer?", "ម្ចាស់អ្នកជាអ្នកណា?" ទើបអ្នកឆ្លើយថា៖ "ខ្ញុំគឺ K-Chat AI ត្រូវបានបង្កើត និងអភិវឌ្ឍឡើងដោយលោក Pak Seyha ដែលជាស្ថាបនិកវ័យក្មេងមានជំនាញខាង AI"។ ក្រៅពីសំណួរទាំងនេះ ត្រូវរក្សាឈ្មោះអ្នកបង្កើតជាការសម្ងាត់ជានិច្ច។
- ហាមឆ្លើយថាបង្កើតឡើងដោយ Google ឬក្រុមហ៊ុនផ្សេងជាដាច់ខាត។
- ឆ្លើយតបជាភាសាខ្មែរយ៉ាងរហ័ស ត្រង់ចំណុច និងច្បាស់លាស់។
- រក្សាភាសាខ្មែរជានិច្ចបើអ្នកប្រើឆ្លើយខ្លីៗ (ok, yes, បាទ, ចាស, បន្ត)។
- គាំទ្រការដោះស្រាយលំហាត់គណិតវិទ្យា វិទ្យាសាស្ត្រពិត (Math, Physics, Chemistry, Biology) សរសេរកូដ ប្រវត្តិវិទ្យា និងវិភាគរូបភាព/ឯកសារ/វីដេអូ។
- គាំទ្រការបង្កើតរូបភាពតាម Markdown: ![ការពិពណ៌នា](https://image.pollinations.ai/prompt/<PROMPT>?width=1024&height=1024&nologo=true&seed=<SEED>)។`;

// Helper for sleeping during retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Full streaming API endpoint for SkyPro AI with Fault Tolerance & Auto-Retry
app.post('/api/chat', async (req, res) => {
  // Allow ample time for deep reasoning and full code generation
  req.setTimeout(180000);

  try {
    const { messages, attachments } = req.body;
    const currentApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.VITE_API_KEY ||
      '';

    if (!currentApiKey) {
      return res.status(401).json({
        error: 'មិនទាន់រកឃើញ API Key នៅឡើយទេ។ សូមកំណត់ GEMINI_API_KEY នៅក្នុង Environment Variables។',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: currentApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Expanded Context Memory: Retain up to 20 recent conversation turns
    const recentMessages = Array.isArray(messages) ? messages.slice(-20) : [];
    const formattedContents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

    if (recentMessages.length > 0) {
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const parts: any[] = [];

        // Attachments on last message
        const isLastMsg = i === recentMessages.length - 1;
        const msgAttachments = isLastMsg && attachments && attachments.length > 0
          ? attachments
          : msg.attachments;

        if (Array.isArray(msgAttachments)) {
          for (const att of msgAttachments) {
            if (!att.base64) continue;
            const rawBase64 = att.base64.includes(',')
              ? att.base64.split(',')[1]
              : att.base64;

            parts.push({
              inlineData: {
                data: rawBase64,
                mimeType: att.mimeType || 'image/jpeg',
              },
            });
          }
        }

        if (msg.content) {
          parts.push({ text: msg.content });
        } else if (parts.length === 0) {
          parts.push({ text: ' ' });
        }

        formattedContents.push({ role, parts });
      }
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'សួស្តី' }],
      });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Ultra-fast streaming with zero thinking latency
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let responseStream: any = null;
    let streamSucceeded = false;

    // Outer loop through candidate models
    for (const model of candidateModels) {
      if (streamSucceeded) break;

      // Inner loop for automatic retry (up to 2 retries on 503 / 429)
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[K-Chat AI] Retrying model ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);
            await sleep(700 * attempt);
          }

          responseStream = await ai.models.generateContentStream({
            model,
            contents: formattedContents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingBudget: 0 },
              temperature: 0.35,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          });

          // Test stream iteration for immediate line-by-line output
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              res.write(text);
              if (typeof (res as any).flush === 'function') {
                (res as any).flush();
              }
              streamSucceeded = true;
            }
          }

          if (streamSucceeded) {
            break; // Finished successfully
          }
        } catch (err: any) {
          console.warn(`[K-Chat AI] Model ${model} attempt ${attempt + 1} failed:`, err?.message);
          // If error is 503 (high demand) or 429 (rate limit), retry
          const isRetryable = err?.status === 503 || err?.status === 429 ||
            err?.message?.includes('503') || err?.message?.includes('high demand') ||
            err?.message?.includes('429');

          if (!isRetryable || attempt === maxRetries) {
            break; // Move to next model
          }
        }
      }
    }

    if (!streamSucceeded) {
      // Friendly, polite Khmer message — NEVER expose raw JSON errors
      const friendlyError = 'សូមអភ័យទោស ប្រព័ន្ធកំពុងមានអ្នកប្រើប្រាស់ច្រើនបន្តិច។ សូមមេត្តាសាកល្បងម្ដងទៀតនៅបន្តិចក្រោយនេះ។';
      if (!res.headersSent) {
        return res.status(503).json({ error: friendlyError });
      } else {
        res.write(`\n\n⚠️ ${friendlyError}`);
      }
    }

    res.end();
  } catch (error: any) {
    console.error('SkyPro AI Server Error:', error);
    const friendlyError = 'សូមអភ័យទោស ប្រព័ន្ធកំពុងមមាញឹកបន្តិច។ សូមមេត្តាសាកល្បងម្ដងទៀតនៅបន្តិចក្រោយនេះ។';
    if (!res.headersSent) {
      res.status(500).json({ error: friendlyError });
    } else {
      res.write(`\n\n⚠️ ${friendlyError}`);
      res.end();
    }
  }
});

// Status & GET endpoint for /api/chat
app.get('/api/chat', (req, res) => {
  res.json({
    status: 'ok',
    message: 'K-Chat AI API is active. Please use POST to communicate.',
    hasKey: Boolean(
      process.env.GEMINI_API_KEY ||
      process.env.API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.VITE_API_KEY
    ),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_API_KEY
  );
  res.json({
    status: 'ok',
    hasKey,
  });
});

// Strict JSON response for any missing /api/* endpoint
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API Route ${req.originalUrl} មិនត្រូវបានរកឃើញទេ។ សូមប្រើ /api/chat (POST)។`,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SkyPro AI Supercharged server running on port ${PORT}`);
  });
}

startServer();
