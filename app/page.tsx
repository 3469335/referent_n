'use client';

import { useState } from 'react';

interface ArticleData {
  date: string;
  title: string;
  content: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);

  const handleLoadArticle = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи');
      return;
    }

    setLoading(true);
    setActiveButton('load');
    setResult('');
    setArticleData(null);

    try {
      // Вызываем API для парсинга статьи
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке статьи');
      }

      const parsedArticle: ArticleData = await response.json();
      
      setArticleData(parsedArticle);
      // Форматируем результат в текстовом виде
      const formattedResult = `Дата: ${parsedArticle.date}\n\nЗаголовок: ${parsedArticle.title}\n\nСодержание:\n${parsedArticle.content}`;
      setResult(formattedResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при загрузке статьи. Пожалуйста, попробуйте снова.';
      setResult(`Ошибка: ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!articleData) {
      alert('Сначала загрузите статью');
      return;
    }

    setLoading(true);
    setActiveButton('translate');
    setResult('');

    try {
      // Формируем текст для перевода
      const textToTranslate = `Title: ${articleData.title}\n\nContent:\n${articleData.content}`;

      // Вызываем API для перевода
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToTranslate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при переводе статьи');
      }

      const { translation } = await response.json();
      
      // Форматируем результат
      const formattedResult = `Перевод статьи:\n\n${translation}`;
      setResult(formattedResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при переводе статьи. Пожалуйста, попробуйте снова.';
      setResult(`Ошибка: ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (action: 'summary' | 'theses' | 'telegram') => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи');
      return;
    }

    setLoading(true);
    setActiveButton(action);
    setResult('');
    setArticleData(null);

    try {
      // Здесь будет логика вызова API для обработки статьи
      // Пока что просто имитация загрузки
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Временный результат для демонстрации
      const results = {
        summary: 'Статья рассказывает о применении искусственного интеллекта в современной разработке программного обеспечения...',
        theses: '• ИИ становится неотъемлемой частью разработки ПО\n• Автоматизация процессов разработки\n• Улучшение качества кода',
        telegram: '🤖 Новости ИИ в разработке\n\nИскусственный интеллект продолжает трансформировать индустрию разработки ПО...'
      };
      
      setResult(results[action]);
    } catch (error) {
      setResult('Произошла ошибка при обработке статьи. Пожалуйста, попробуйте снова.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Референт англоязычных статей
          </h1>
          
          {/* Поле ввода URL с кнопкой загрузки */}
          <div className="mb-8">
            <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL англоязычной статьи
            </label>
            <div className="flex gap-3">
              <input
                id="article-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && url.trim()) {
                    handleLoadArticle();
                  }
                }}
              />
              <button
                onClick={handleLoadArticle}
                disabled={loading || !url.trim()}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap ${
                  activeButton === 'load' && loading
                    ? 'bg-blue-600 ring-4 ring-blue-300'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {loading && activeButton === 'load' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка...
                  </span>
                ) : (
                  'Загрузить статью'
                )}
              </button>
            </div>
          </div>

          {/* Кнопка перевода */}
          {articleData && (
            <div className="mb-6">
              <button
                onClick={handleTranslate}
                disabled={loading}
                className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  activeButton === 'translate' && loading
                    ? 'bg-orange-600 ring-4 ring-orange-300'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {loading && activeButton === 'translate' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Перевод...
                  </span>
                ) : (
                  'Перевести статью'
                )}
              </button>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading || !url.trim()}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                activeButton === 'summary' && loading
                  ? 'bg-indigo-600 ring-4 ring-indigo-300'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {loading && activeButton === 'summary' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'О чем статья?'
              )}
            </button>

            <button
              onClick={() => handleSubmit('theses')}
              disabled={loading || !url.trim()}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                activeButton === 'theses' && loading
                  ? 'bg-green-600 ring-4 ring-green-300'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {loading && activeButton === 'theses' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Тезисы'
              )}
            </button>

            <button
              onClick={() => handleSubmit('telegram')}
              disabled={loading || !url.trim()}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                activeButton === 'telegram' && loading
                  ? 'bg-purple-600 ring-4 ring-purple-300'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {loading && activeButton === 'telegram' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Пост для Telegram'
              )}
            </button>
          </div>

          {/* Блок отображения результата */}
          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {articleData ? 'Загруженная статья:' : 'Результат:'}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {result}
                </p>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Введите URL статьи и выберите действие для отображения результата
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

