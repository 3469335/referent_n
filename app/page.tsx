'use client';

import { useState } from 'react';

interface ArticleData {
  date: string;
  title: string;
  content: string;
}

interface CachedResult {
  summary?: string;
  theses?: string;
  telegram?: string;
  translate?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [cachedResults, setCachedResults] = useState<CachedResult>({});
  const [processStatus, setProcessStatus] = useState<string>('');

  const handleTranslate = async () => {
    if (!articleData) {
      alert('Сначала загрузите статью');
      return;
    }

    // Проверяем кэш перед запросом
    if (cachedResults.translate) {
      setResult(cachedResults.translate);
      setActiveButton('translate');
      return;
    }

    setLoading(true);
    setActiveButton('translate');
    setResult('');
    setProcessStatus('Перевожу статью...');

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
      
      // Сохраняем результат в кэш
      setCachedResults(prev => ({
        ...prev,
        translate: formattedResult
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при переводе статьи. Пожалуйста, попробуйте снова.';
      setResult(`Ошибка: ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
      setProcessStatus('');
    }
  };

  const handleSubmit = async (action: 'summary' | 'theses' | 'telegram') => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи');
      return;
    }

    // Проверяем кэш перед запросом
    const cacheKey = action;
    if (cachedResults[cacheKey] && articleData) {
      setResult(cachedResults[cacheKey]!);
      setActiveButton(action);
      return;
    }

    setLoading(true);
    setActiveButton(action);
    setResult('');

    try {
      let currentArticleData = articleData;

      // Если статья не загружена, сначала загружаем её
      if (!currentArticleData) {
        setProcessStatus('Загружаю статью...');
        const parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url.trim() }),
        });

        if (!parseResponse.ok) {
          const errorData = await parseResponse.json();
          throw new Error(errorData.error || 'Ошибка при загрузке статьи');
        }

        currentArticleData = await parseResponse.json();
        setArticleData(currentArticleData);
        // Очищаем кэш при загрузке новой статьи
        setCachedResults({});
      }

      // Проверяем, что данные статьи получены
      if (!currentArticleData) {
        throw new Error('Не удалось загрузить статью');
      }

      // Обновляем статус в зависимости от действия
      const statusMessages = {
        summary: 'Создаю резюме статьи...',
        theses: 'Извлекаю тезисы...',
        telegram: 'Создаю пост для Telegram...'
      };
      setProcessStatus(statusMessages[action]);

      // Формируем текст для обработки (заголовок + содержание)
      const textToProcess = `Title: ${currentArticleData.title}\n\nContent:\n${currentArticleData.content}`;

      // Вызываем API для AI-обработки
      const aiResponse = await fetch('/api/ai-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: textToProcess,
          action: action,
          // Передаем URL источника для telegram поста
          ...(action === 'telegram' && { sourceUrl: url.trim() })
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'Ошибка при обработке статьи');
      }

      const { result } = await aiResponse.json();
      setResult(result);
      
      // Сохраняем результат в кэш
      setCachedResults(prev => ({
        ...prev,
        [cacheKey]: result
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при обработке статьи. Пожалуйста, попробуйте снова.';
      setResult(`Ошибка: ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
      setProcessStatus('');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Референт англоязычных статей
          </h1>
          
          {/* Поле ввода URL */}
          <div className="mb-8">
            <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL англоязычной статьи
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                // Очищаем кэш при изменении URL
                if (e.target.value.trim() !== url.trim()) {
                  setCachedResults({});
                  setArticleData(null);
                }
              }}
              placeholder="Введите URL статьи, например: https://example.com/article"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Укажите ссылку на англоязычную статью
            </p>
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

          {/* Информационное сообщение */}
          {url.trim() && !articleData && !loading && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Подсказка:</strong> Нажмите на любую из кнопок ниже — статья загрузится и обработается автоматически.
                </p>
              </div>
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
              title={!url.trim() ? 'Сначала введите URL статьи' : articleData ? 'Создать резюме статьи' : 'Загрузить и создать резюме статьи'}
            >
              {loading && activeButton === 'summary' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {articleData ? 'Создание резюме...' : 'Загрузка и обработка...'}
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
              title={!url.trim() ? 'Сначала введите URL статьи' : articleData ? 'Извлечь тезисы статьи' : 'Загрузить и извлечь тезисы статьи'}
            >
              {loading && activeButton === 'theses' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {articleData ? 'Извлечение тезисов...' : 'Загрузка и обработка...'}
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
              title={!url.trim() ? 'Сначала введите URL статьи' : articleData ? 'Создать пост для Telegram' : 'Загрузить и создать пост для Telegram'}
            >
              {loading && activeButton === 'telegram' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {articleData ? 'Создание поста...' : 'Загрузка и обработка...'}
                </span>
              ) : (
                'Пост для Telegram'
              )}
            </button>
          </div>

          {/* Блок статуса процесса */}
          {loading && processStatus && (
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {processStatus}
                </p>
              </div>
            </div>
          )}

          {/* Блок отображения результата */}
          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {result.startsWith('Ошибка:') ? 'Ошибка' : 
                   activeButton === 'translate' ? 'Перевод статьи:' :
                   activeButton === 'summary' ? 'Резюме статьи:' :
                   activeButton === 'theses' ? 'Тезисы статьи:' :
                   activeButton === 'telegram' ? 'Пост для Telegram:' :
                   articleData ? 'Загруженная статья:' : 'Результат:'}
                </h2>
                {articleData && !result.startsWith('Ошибка:') && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Статья загружена
                  </div>
                )}
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className={`whitespace-pre-wrap leading-relaxed ${
                  result.startsWith('Ошибка:') 
                    ? 'text-red-700 dark:text-red-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {result}
                </p>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {!url.trim() 
                  ? 'Введите URL статьи и выберите действие'
                  : !articleData
                  ? 'Загрузите статью или выберите действие для автоматической загрузки'
                  : 'Выберите действие для обработки статьи'}
              </p>
              {articleData && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Статья готова к обработке: <span className="font-medium">{articleData.title}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

