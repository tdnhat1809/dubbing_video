import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROMPTS_PATH = path.join(process.cwd(), '..', 'prompts.json');

function loadPromptByCategory(categoryName) {
  try {
    const raw = fs.readFileSync(PROMPTS_PATH, 'utf-8');
    const prompts = JSON.parse(raw);
    // Search by name or id
    for (const [key, val] of Object.entries(prompts)) {
      if (val.name === categoryName || val.id === categoryName || key === categoryName) {
        return val.prompt_subtitle || null;
      }
    }
  } catch (err) {
    console.error('Failed to load prompts.json:', err.message);
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subtitles, sourceLang, targetLang, engine, taskId, contentCategory } = body;

    if (!subtitles || !subtitles.length) {
      return NextResponse.json({ error: 'No subtitles to translate' }, { status: 400 });
    }

    // Build SRT content from subtitles
    const srtContent = subtitles.map((s, i) => {
      return `${i + 1}\n${s.start.replace('.', ',')} --> ${s.end.replace('.', ',')}\n${s.original || s.text}\n`;
    }).join('\n');

    // Try 9router API first (localhost:20128)
    const apiUrl = process.env.TRANSLATE_API_URL || 'http://localhost:20128/v1/chat/completions';
    const apiKey = process.env.TRANSLATE_API_KEY || 'sk-8374ab1dd9f3f68b-tht24q-274a4d11';
    // Map engine display name to 9router model ID
    const MODEL_MAP = {
      'GPT 5.4': 'cx/gpt-5.4',
      'GPT 5.3': 'cx/gpt-5.3-codex-xhigh',
      'GPT 5.2': 'cx/gpt-5.2-codex-spark',
      'GPT 5.1': 'cx/gpt-5.1-codex-max',
      'GPT 5.1 Mini': 'cx/gpt-5.1-codex-mini-high',
    };
    const model = MODEL_MAP[engine] || 'cx/gpt-5.4';

    // Load system prompt from prompts.json if a content category is selected
    let systemPrompt = 'Bạn là dịch giả phụ đề chuyên nghiệp. Dịch tự nhiên, giữ tên nhân vật, ngữ cảnh nhất quán.';
    if (contentCategory) {
      const categoryPrompt = loadPromptByCategory(contentCategory);
      if (categoryPrompt) {
        systemPrompt = categoryPrompt;
        console.log(`Using prompt for category: ${contentCategory}`);
      }
    }

    // Batch translate using LLM
    const batchSize = 15;
    const translated = [];
    const sourceTexts = subtitles.map(s => s.original || s.text);

    for (let i = 0; i < sourceTexts.length; i += batchSize) {
      const batch = sourceTexts.slice(i, i + batchSize);
      const context = translated.slice(-5).map((t, idx) => `${sourceTexts[i - 5 + idx] || ''} → ${t}`).join('\n');

      const prompt = `Dịch ${batch.length} dòng phụ đề sau từ ${sourceLang || 'Tiếng Trung'} sang ${targetLang || 'Tiếng Việt'}.
${context ? `\nNgữ cảnh đã dịch trước:\n${context}\n` : ''}
Dịch các dòng sau:
${batch.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

Trả về JSON: {"translations": ["dòng 1 đã dịch", "dòng 2 đã dịch", ...]}
Chỉ trả JSON, không giải thích.`;

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(text);
          const batchTranslations = parsed.translations || [];
          translated.push(...batchTranslations);
        } else {
          // Fallback: keep original
          translated.push(...batch);
        }
      } catch (err) {
        console.error('Translation batch error:', err.message);
        translated.push(...batch);
      }
    }

    // Build result
    const result = subtitles.map((s, i) => ({
      ...s,
      translation: translated[i] || s.original || s.text,
    }));

    return NextResponse.json({
      status: 'completed',
      subtitles: result,
      engine: model,
      count: result.length,
      category: contentCategory || 'default',
    });

  } catch (err) {
    console.error('Translate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
