/**
 * SkyPro AI Service — Full Real AI Generation
 * No artificial 7-second cutoffs; supports comprehensive long answers and code.
 */

export interface AIResponse {
  text: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
}

export async function askSkyProAI(
  prompt: string,
  attachments?: Array<{ name: string; mimeType: string; base64: string }>
): Promise<AIResponse> {
  const controller = new AbortController();
  // Generous 90s safeguard for complex problem-solving
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        attachments: attachments || [],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawError = errData.error || '';
      const polite = 'សូមអភ័យទោស ប្រព័ន្ធកំពុងមមាញឹកបន្តិច។ សូមមេត្តាសាកល្បងម្ដងទៀតនៅបន្តិចក្រោយនេះ។';
      throw new Error(rawError && !rawError.includes('{') && !rawError.includes('503') ? rawError : polite);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('មិនអាចទទួល Response Stream បានទេ');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const codeBlockMatch = fullText.match(/```(\w+)?\n([\s\S]*?)```/);
    const codeSnippet = codeBlockMatch
      ? {
          language: codeBlockMatch[1] || 'plaintext',
          code: codeBlockMatch[2].trim(),
        }
      : undefined;

    return {
      text: fullText,
      codeSnippet,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('ការឆ្លើយតបត្រូវចំណាយពេលយូរពេក សូមសាកល្បងម្ដងទៀត។');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
