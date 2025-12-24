import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Валидация URL
    let articleUrl: URL;
    try {
      articleUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Получаем HTML страницы с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

    let response: Response;
    try {
      response = await fetch(articleUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout: Failed to fetch article within 30 seconds' },
          { status: 504 }
        );
      }
      throw error;
    }

    if (!response.ok) {
      // Определяем тип ошибки для дружественного сообщения
      let errorType = 'parse';
      if (response.status === 404) {
        errorType = 'not_found';
      } else if (response.status >= 500) {
        errorType = 'server_error';
      } else if (response.status === 403 || response.status === 401) {
        errorType = 'access_denied';
      }
      
      return NextResponse.json(
        { 
          error: `Failed to fetch article: ${response.statusText}`,
          errorType: errorType,
          status: response.status
        },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = load(html);

    // Извлекаем заголовок
    let title = '';
    const titleSelectors = [
      'h1',
      'article h1',
      '[role="article"] h1',
      '.article-title',
      '.post-title',
      'title',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ];

    for (const selector of titleSelectors) {
      if (selector.startsWith('meta')) {
        const metaContent = $(selector).attr('content');
        if (metaContent) {
          title = metaContent.trim();
          break;
        }
      } else {
        const element = $(selector).first();
        if (element.length) {
          title = element.text().trim();
          if (title) break;
        }
      }
    }

    // Извлекаем дату публикации
    let date = new Date().toISOString();
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[itemprop="datePublished"]',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
      '.published-date',
      '.post-date',
    ];

    for (const selector of dateSelectors) {
      if (selector.startsWith('meta')) {
        const metaContent = $(selector).attr('content');
        if (metaContent) {
          try {
            date = new Date(metaContent).toISOString();
            break;
          } catch {}
        }
      } else {
        const element = $(selector).first();
        if (element.length) {
          const dateAttr = element.attr('datetime') || element.text().trim();
          if (dateAttr) {
            try {
              date = new Date(dateAttr).toISOString();
              break;
            } catch {}
          }
        }
      }
    }

    // Извлекаем содержимое статьи
    let content = '';
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main article',
      '[itemprop="articleBody"]',
    ];

    for (const selector of contentSelectors) {
      const article = $(selector).first();
      if (article.length) {
        // Удаляем ненужные элементы
        article.find('script, style, nav, aside, .advertisement, .ads, .social-share, .comments').remove();
        
        // Извлекаем текст из параграфов
        const paragraphs = article.find('p');
        if (paragraphs.length > 0) {
          content = paragraphs
            .map((_, el) => $(el).text().trim())
            .get()
            .filter(text => text.length > 20) // Фильтруем слишком короткие параграфы
            .join('\n\n');
          
          if (content.length > 100) break; // Если нашли достаточно контента
        }
      }
    }

    // Если не нашли контент через селекторы, пробуем извлечь из body
    if (!content || content.length < 100) {
      const body = $('body');
      body.find('script, style, nav, aside, header, footer, .advertisement, .ads, .social-share, .comments').remove();
      
      const paragraphs = body.find('p');
      if (paragraphs.length > 0) {
        content = paragraphs
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(text => text.length > 20)
          .slice(0, 20) // Ограничиваем количество параграфов
          .join('\n\n');
      }
    }

    // Если все еще нет контента, используем fallback
    if (!content || content.length < 50) {
      content = $('body').text().trim().substring(0, 5000);
    }

    // Очищаем контент от лишних пробелов
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return NextResponse.json({
      date,
      title: title || 'Untitled Article',
      content: content || 'Could not extract article content',
    });
  } catch (error) {
    console.error('Error parsing article:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse article', 
        errorType: 'parse_error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

