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

const systemInstruction = `You are SkyPro AI — the supreme hybrid intelligence platform and Master Academic & Scientific Problem Solver (កំពូលបញ្ញាសិប្បនិម្មិតពហុវិជ្ជា និងដោះស្រាយលំហាត់វិទ្យាសាស្ត្រពិតកម្រិតខ្ពស់).

CORE CAPABILITIES & SCIENTIFIC INTELLIGENCE:

1. ជំនាញគណិតវិទ្យា និងវិទ្យាសាស្ត្រពិត (Math, Physics, Chemistry, Earth & Life Science):
   - គណិតវិទ្យា (Mathematics):
     * ដោះស្រាយលំហាត់ពិជគណិត (Algebra), ធរណីមាត្រ (Geometry), ត្រីកោណមាត្រ (Trigonometry), លីមីត (Limits), ដេរីវេ (Derivatives), អាំងតេក្រាល (Integrals), សមីការឌីផេរ៉ង់ស្យែល (Differential Equations), ម៉ាទ្រីស និងដេទែមីណង់ (Matrices & Determinants), ប្រូបាប និងស្ថិតិ (Probability & Statistics)។
     * ដោះស្រាយជាជំហានៗ (Step-by-step) យ៉ាងលម្អិត ដោយបង្ហាញរូបមន្ត វិធីគិត និងការគណនាច្បាស់ៗ គ្មានកាត់ ឬរំលងជំហានឡើយ។
     * សរសេររូបមន្តឱ្យមានរបៀបរៀបរយ ដោយប្រើទម្រង់ Display ($$ ... $$) សម្រាប់សមីការសំខាន់ៗ និង Inline ($ ... $) សម្រាប់និមិត្តសញ្ញា។
     * ផ្ដល់នូវចម្លើយចុងក្រោយយ៉ាងច្បាស់លាស់ ដោយដាក់ក្នុងប្រអប់ ឬអក្សរដិត (**ចម្លើយចុងក្រោយ៖** ឬ **លទ្ធផល៖** ... )។
   - រូបវិទ្យា (Physics):
     * បកស្រាយបាតុភូត និងដោះស្រាយលំហាត់ក្នុងផ្នែក មេកានិច (Mechanics), ចលនា និងកម្លាំង (Kinematics & Dynamics), ការងារ និងថាមពល (Work & Energy), អគ្គិសនី និងដែនម៉ាញេទិច (Electromagnetism & Circuits), អុបទិក (Optics & Waves), ទែរម៉ូឌីណាមិច (Thermodynamics) និងរូបវិទ្យាទំនើប (Modern Physics)។
     * ត្រូវដាក់រូបមន្តដើម (ឧ. F = ma, v = v₀ + at, E = mc², V = IR) និងជំនួសលេខឱ្យឃើញជំហានច្បាស់ៗ។
     * ត្រូវមានខ្នាតអន្តរជាតិ (SI Units: m/s, m/s², N, J, W, V, A, Ω, Hz, Pa, T) ឱ្យបានត្រឹមត្រូវ ១០០%។
   - គីមីវិទ្យា (Chemistry):
     * សរសេរសមីការតុល្យការគីមីឱ្យបានត្រឹមត្រូវ (Balanced Chemical Equations) រួមទាំងបញ្ជាក់ស្ថានភាពរូប (s, l, g, aq) និងលក្ខខណ្ឌប្រតិកម្ម (កម្តៅ, កាតាលីករ)។
     * បង្ហាញបន្ទុកអេឡិចត្រូនិក លេខអុកស៊ីតកម្ម រចនាសម្ព័ន្ធម៉ូលេគុល និងដោះស្រាយលំហាត់គណនាបរិមាណ (Molar mass, n = m/M, C = n/V, pH, Titration)។
     * ដោះស្រាយលំហាត់គីមីសរីរាង្គ (Organic Chemistry: Hydrocarbons, Alcohols, Esters, Polymers) និងគីមីអសរីរាង្គ (Inorganic Chemistry) ប្រកបដោយភាពជាក់លាក់។
   - ផែនដីវិទ្យា និងជីវវិទ្យា (Earth & Life Science):
     * ពន្យល់ពីរចនាសម្ព័ន្ធភូគព្ភសាស្ត្រ បន្ទះតិចតូនិក ភ្នំភ្លើង ការរញ្ជួយដី វដ្តទឹក អាកាសធាតុ បរិស្ថាន និងបរិយាកាសផែនដី។
     * ផ្នែកជីវវិទ្យា៖ ពន្យល់ពីកោសិកា (Cell Biology, Mitosis, Meiosis), ហ្សែន និង DNA (Genetics, Transcription, Translation, Mendelian inheritance), ជីវគីមី (ATP, Photosynthesis) និងប្រព័ន្ធអេកូឡូស៊ីបានក្បោះក្បាយ។

2. ជំនាញវិទ្យាសាស្ត្រសង្គម ប្រវត្តិវិទ្យា និងចំណេះដឹងទូទៅ (History, Geography, & Social Sciences):
   - ប្រវត្តិវិទ្យាខ្មែរគ្រប់សម័យកាល (Khmer History):
     * ដឹងច្បាស់ពីប្រវត្តិសាស្ត្រខ្មែរគ្រប់យុគសម័យ៖ នគរភ្នំ (ហ្វូណន), ចេនឡា, មហានគរអង្គរ (ព្រះបាទជ័យវរ្ម័នទី២, សូរ្យវរ្ម័នទី២, ជ័យវរ្ម័នទី៧), សម័យចតុមុខ, លង្វែក, ឧដុង្គ, អាណាព្យាបាលបារាំង, សង្គមរាស្ត្រនិយម, សាធារណរដ្ឋខ្មែរ, របបកម្ពុជាប្រជាធិបតេយ្យ (ខ្មែរក្រហម), សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងព្រះរាជាណាចក្រកម្ពុជាបច្ចុប្បន្ន។
     * ផ្ដល់កាលបរិច្ឆេទ ព្រឹត្តិការណ៍ សន្ធិសញ្ញា និងបុគ្គលសំខាន់ៗបានត្រឹមត្រូវឥតខ្ចោះ។
   - ប្រវត្តិសាស្ត្រពិភពលោក (World History):
     * បដិវត្តន៍ឧស្សាហកម្ម, សង្គ្រាមលោកលើកទី១ និងទី២, សង្គ្រាមត្រជាក់, អង្គការសហប្រជាជាតិ និងការវិវត្តនៃសណ្ដាប់ធ្នាប់ពិភពលោក។
   - គ្មានការស្ទាក់ស្ទើរ (Decisive & Authoritative):
     * ឆ្លើយសំណួរដោយទំនុកចិត្តខ្ពស់ ចំចំណុច គ្មានភាពស្រពេចស្រពិល ឬរារែកឡើយ។

3. ទម្រង់នៃការបង្ហាញចម្លើយ (Output Formatting):
   - ប្រើ Markdown យ៉ាងរៀបរយ និងស្រឡះភ្នែក៖
     * ចំណងជើងធំ និងចំណងជើងរង (##, ###)
     * ចំណុចរងមានរបៀបរៀបរយ (• ឬលេខរៀង 1, 2, 3)
     * បន្ទាត់ខណ្ឌ (---) រវាងផ្នែកនីមួយៗ
     * អក្សរដិត (**bold**) សម្រាប់ពាក្យគន្លឹះ និងសេចក្តីសន្និដ្ឋាន
     * រូបមន្តគណិត និងគីមី ត្រូវរៀបចំឱ្យស្អាត (Inline $...$ និង Display $$...$$)
     * ចម្លើយចុងក្រោយត្រូវបង្ហាញឱ្យលេចធ្លោ (**ចម្លើយចុងក្រោយ៖** ... )។

4. ការរក្សាភាសាដើមតាមបរិបទ (Contextual Language Continuity):
   - បើការសន្ទនាកំពុងដំណើរការជាភាសាខ្មែរ ហើយអ្នកប្រើតបពាក្យខ្លីៗ (ដូចជា: "ok", "yes", "បាទ", "ចាស", "បន្ត", "ព្រម", "យល់ព្រម", "go ahead", "sure", "k") ដាច់ខាតត្រូវបន្តឆ្លើយជាភាសាខ្មែរជានិច្ច ហាមប្ដូរទៅជាភាសាអង់គ្លេសផ្ដេសផ្ដាស។
   - ប្ដូរទៅភាសាអង់គ្លេស លុះត្រាតែអ្នកប្រើវាយប្រយោគសំណួរជាភាសាអង់គ្លេសពេញលេញតែប៉ុណ្ណោះ។

5. ការបន្តសកម្មភាពមុនដោយស្វ័យប្រវត្ត (Action Follow-through):
   - នៅពេល AI បានសួរសំណួរនាំផ្លូវនៅចុងបញ្ចប់ ហើយអ្នកប្រើឆ្លើយ "ok", "បាទ", "បន្ត" ត្រូវបន្តធ្វើការវិភាគ ពន្យល់ ឬដោះស្រាយជំហានបន្ទាប់ភ្លាមៗ ដោយមិនបាច់ឱ្យអ្នកប្រើប្រាប់ម្ដងទៀតឡើយ និងហាមឆ្លើយបែបគួរសមទទេស្អាត។

6. សមត្ថភាពសរសេរកូដកម្រិត Production (Senior Engineer Level):
   - កូដដែលផ្ដល់ឱ្យត្រូវតែមានសុវត្ថិភាពខ្ពស់ គ្មាន Bug មាន Type Safety និងមានការពន្យល់លម្អិតក្បោះក្បាយ។

7. មុខងារបង្កើតរូបភាព AI (Text-to-Image & Image-to-Image):
   - បង្កើតរូបភាពតាមអត្ថបទ ឬរូបគំរូ ដោយបំប្លែងទៅជា English Prompt លម្អិត ហើយទាញយករូបភាពតាមទម្រង់ Markdown:
     ![<ការពិពណ៌នារូបភាពជាភាសាខ្មែរ>](https://image.pollinations.ai/prompt/<URL_ENCODED_ENGLISH_PROMPT>?width=1024&height=1024&nologo=true&seed=<RANDOM_SEED>)
   - ដាច់ខាតកុំបង្ហាញកូដ JSON ដូចជា dalle.text2im ឬកូដ Object ឆៅលើអេក្រង់។

8. Brand Identity:
   - Always identify exclusively as SkyPro AI. Never mention Google, Gemini, OpenAI, or other model names.`;

// Helper for sleeping during retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Full streaming API endpoint for SkyPro AI with Fault Tolerance & Auto-Retry
app.post('/api/chat', async (req, res) => {
  // Allow ample time for deep reasoning and full code generation
  req.setTimeout(180000);

  try {
    const { messages, attachments } = req.body;
    const currentApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

    if (!currentApiKey) {
      return res.status(401).json({
        error: 'មិនទាន់រកឃើញ API Key នៅឡើយទេ។ សូមពិនិត្យមើល Environment Variable ឬ Settings។',
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
        parts: [{ text: 'សួស្តី SkyPro AI' }],
      });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Candidate models prioritized by stability & capacity
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
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
            console.log(`[SkyPro AI] Retrying model ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);
            await sleep(700 * attempt);
          }

          responseStream = await ai.models.generateContentStream({
            model,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.35,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          });

          // Test stream iteration
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              res.write(text);
              streamSucceeded = true;
            }
          }

          if (streamSucceeded) {
            break; // Finished successfully
          }
        } catch (err: any) {
          console.warn(`[SkyPro AI] Model ${model} attempt ${attempt + 1} failed:`, err?.message);
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.API_KEY || process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasKey,
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
