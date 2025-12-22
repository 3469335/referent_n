import { NextRequest, NextResponse } from 'next/server';

type ActionType = 'summary' | 'theses' | 'telegram';

interface PromptConfig {
  system: string;
  user: string;
  temperature: number;
}

const getPromptConfig = (action: ActionType, text: string, sourceUrl?: string): PromptConfig => {
  const configs: Record<ActionType, PromptConfig> = {
    summary: {
      system: 'You are an expert article summarizer specializing in English-language articles. Provide a clear, concise summary in Russian that captures:\n- The main topic and purpose of the article\n- Key arguments and findings\n- Important conclusions or implications\nKeep it brief (2-3 paragraphs, approximately 150-200 words). Write in natural, fluent Russian. Do not add any explanations, comments, or meta-text - only provide the summary itself.',
      user: `Summarize the following English article in Russian. Focus on the essential information and main ideas:\n\n${text}`,
      temperature: 0.3,
    },
    theses: {
      system: 'You are an expert at analyzing articles and extracting key points. Create a structured list of main theses from the article in Russian. Each thesis should:\n- Be a complete, meaningful statement\n- Represent a significant idea or finding\n- Be concise (one sentence per thesis)\nFormat as a bulleted list using "-" or "•". Focus on the most important and actionable points. Write in natural Russian. Do not add explanations or comments - only provide the list.',
      user: `Extract the main theses and key points from the following English article. Present them as a bulleted list in Russian:\n\n${text}`,
      temperature: 0.3,
    },
    telegram: {
      system: 'You are a social media content creator. Create an engaging Telegram post in Russian based on the article. Include:\n- Catchy headline/emoji\n- Brief summary (2-3 sentences)\n- Key points (bullet format)\n- Call to action or conclusion\n- At the end, add a hyperlink to the source article in Telegram markdown format: [текст](URL)\nFormat it for Telegram (use emojis, line breaks, hashtags if appropriate). Do not add any explanations or comments, only provide the post.',
      user: sourceUrl 
        ? `Create a Telegram post in Russian based on the following article. At the end of the post, add a hyperlink to the source article in Telegram markdown format [Источник](${sourceUrl}) or [Читать далее](${sourceUrl}). Use the format: [текст](URL)\n\nArticle:\n${text}`
        : `Create a Telegram post in Russian based on the following article:\n\n${text}`,
      temperature: 0.5,
    },
  };

  return configs[action];
};

export async function POST(request: NextRequest) {
  try {
    const { text, action, sourceUrl } = await request.json();

    // Валидация входных данных
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!action || !['summary', 'theses', 'telegram'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (summary, theses, or telegram)' },
        { status: 400 }
      );
    }

    // Проверка наличия API ключа
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured' },
        { status: 500 }
      );
    }

    // Обработка длинных статей: разбиваем на части если текст слишком длинный
    const maxTextLength = 40000; // Оптимальная длина для одного запроса
    const chunkSize = 35000; // Размер части для обработки
    
    let textToProcess = text;
    
    if (text.length > maxTextLength) {
      // Для длинных статей берем начало и конец (важные части)
      const startChunk = text.substring(0, chunkSize);
      const endChunk = text.substring(text.length - chunkSize);
      textToProcess = `${startChunk}\n\n[...пропущена средняя часть статьи...]\n\n${endChunk}\n\n[Примечание: статья была сокращена для обработки из-за большого объема]`;
    }

    // Получаем конфигурацию промпта для выбранного действия
    const finalPromptConfig = getPromptConfig(action as ActionType, textToProcess, sourceUrl);

    // Вызываем OpenRouter API с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд таймаут

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Referent N - Article AI Processor',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            {
              role: 'system',
              content: finalPromptConfig.system,
            },
            {
              role: 'user',
              content: finalPromptConfig.user,
            },
          ],
          temperature: finalPromptConfig.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('OpenRouter API error:', errorData);
        return NextResponse.json(
          { 
            error: `AI processing failed: ${errorData.error?.message || response.statusText}`,
            details: errorData 
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        return NextResponse.json(
          { error: 'No result received from API' },
          { status: 500 }
        );
      }

      return NextResponse.json({ result });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout:', error);
        return NextResponse.json(
          { 
            error: 'Request timeout: AI processing took too long. Please try again or use a shorter article.',
            details: 'The request exceeded 60 seconds timeout'
          },
          { status: 504 }
        );
      }
      
      console.error('Error processing article with AI:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process article with AI', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing article with AI:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process article with AI', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

