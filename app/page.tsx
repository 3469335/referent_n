'use client';

import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Функция для преобразования ошибок в дружественные тексты
  const getFriendlyError = (error: Error | string, context?: string): string => {
    const errorMessage = error instanceof Error ? error.message : error;
    const lowerMessage = errorMessage.toLowerCase();

    // Ошибки загрузки статьи
    if (context === 'parse' || lowerMessage.includes('fetch') || lowerMessage.includes('parse') || 
        lowerMessage.includes('timeout') || lowerMessage.includes('404') || 
        lowerMessage.includes('500') || lowerMessage.includes('failed to fetch')) {
      return 'Не удалось загрузить статью по этой ссылке.';
    }

    // Ошибки AI обработки
    if (context === 'ai' || lowerMessage.includes('ai processing') || 
        lowerMessage.includes('openrouter') || lowerMessage.includes('api key')) {
      if (lowerMessage.includes('timeout') || lowerMessage.includes('took too long')) {
        return 'Обработка заняла слишком много времени. Попробуйте еще раз или используйте более короткую статью.';
      }
      if (lowerMessage.includes('api key')) {
        return 'Ошибка конфигурации: не настроен API ключ.';
      }
      return 'Не удалось обработать статью. Попробуйте еще раз.';
    }

    // Ошибки перевода
    if (context === 'translate' || lowerMessage.includes('translation') || lowerMessage.includes('translate')) {
      if (lowerMessage.includes('timeout')) {
        return 'Перевод занял слишком много времени. Попробуйте еще раз.';
      }
      return 'Не удалось перевести статью. Попробуйте еще раз.';
    }

    // Общие ошибки
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'Проблема с подключением к интернету. Проверьте соединение и попробуйте еще раз.';
    }

    // Ошибки генерации изображений
    if (context === 'image' || lowerMessage.includes('image generation') || lowerMessage.includes('huggingface')) {
      if (lowerMessage.includes('model_loading') || lowerMessage.includes('модель загружается')) {
        return 'Модель загружается. Пожалуйста, подождите несколько секунд и попробуйте снова.';
      }
      return 'Не удалось сгенерировать изображение. Попробуйте еще раз.';
    }

    // Если не удалось определить тип ошибки, возвращаем общее сообщение
    return 'Произошла ошибка. Попробуйте еще раз.';
  };

  // Функция очистки всех состояний
  const handleClear = () => {
    setUrl('');
    setResult('');
    setError(null);
    setArticleData(null);
    setCachedResults({});
    setActiveButton(null);
    setProcessStatus('');
    setCopied(false);
    setImageCopied(false);
    setGeneratedImage(null);
  };

  // Функция копирования изображения
  const handleCopyImage = async () => {
    if (!generatedImage) return;
    
    try {
      // Преобразуем base64 в blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      
      // Копируем изображение в буфер обмена
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка при копировании изображения:', error);
      // Fallback: пытаемся скопировать как URL
      try {
        await navigator.clipboard.writeText(generatedImage);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Ошибка при копировании URL изображения:', fallbackError);
      }
    }
  };

  // Функция копирования результата
  const handleCopy = async () => {
    if (result) {
      try {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Автоматическая прокрутка к результатам после успешной генерации
  useEffect(() => {
    if ((result && !result.startsWith('Ошибка:')) || generatedImage) {
      if (resultRef.current) {
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [result, generatedImage]);

  // Функция генерации иллюстрации
  const handleGenerateImage = async () => {
    if (!cachedResults.summary) {
      setError('Сначала получите резюме статьи, нажав кнопку "О чем статья?"');
      return;
    }

    setLoading(true);
    setActiveButton('illustration');
    setError(null);
    setProcessStatus('Генерирую иллюстрацию...');

    try {
      // Создаем промпт на основе резюме статьи
      const imagePrompt = `Create a detailed, professional illustration based on this article summary: ${cachedResults.summary}. The image should be visually appealing, modern, and represent the main theme of the article. Style: digital art, high quality, detailed.`;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Ошибка при обработке ответа сервера' };
        }
        
        if (errorData.errorType === 'model_loading') {
          throw new Error('Модель загружается. Пожалуйста, подождите несколько секунд и попробуйте снова.');
        }
        
        if (errorData.errorType === 'auth_error') {
          throw new Error('Ошибка авторизации. Проверьте правильность API ключа Hugging Face в настройках.');
        }
        
        throw new Error(errorData.error || 'Ошибка при генерации изображения');
      }

      const { image } = await response.json();
      setGeneratedImage(image);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось сгенерировать изображение. Попробуйте еще раз.';
      setError(getFriendlyError(errorMessage, 'image'));
      console.error(error);
    } finally {
      setLoading(false);
      setProcessStatus('');
    }
  };

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
    setError(null);
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const friendlyError = getFriendlyError(errorData.error || 'Ошибка при переводе статьи', 'translate');
        setError(friendlyError);
        throw new Error(friendlyError);
      }

      const { translation } = await response.json();
      
      // Форматируем результат
      const formattedResult = `Перевод статьи:\n\n${translation}`;
      setResult(formattedResult);
      setError(null);
      
      // Сохраняем результат в кэш
      setCachedResults(prev => ({
        ...prev,
        translate: formattedResult
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при переводе статьи. Пожалуйста, попробуйте снова.';
      if (!errorMessage.startsWith('Не удалось') && !errorMessage.startsWith('Перевод занял')) {
        setError(getFriendlyError(errorMessage, 'translate'));
      }
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
    setError(null);

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
          // Для всех ошибок загрузки статьи показываем единое сообщение
          setError('Не удалось загрузить статью по этой ссылке.');
          throw new Error('Не удалось загрузить статью по этой ссылке.');
        }

        currentArticleData = await parseResponse.json();
        setArticleData(currentArticleData);
        setError(null);
        // Очищаем кэш при загрузке новой статьи
        setCachedResults({});
      }

      // Проверяем, что данные статьи получены
      if (!currentArticleData) {
        setError('Не удалось загрузить статью по этой ссылке.');
        throw new Error('Не удалось загрузить статью по этой ссылке.');
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
        const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }));
        const friendlyError = getFriendlyError(errorData.error || 'Ошибка при обработке статьи', 'ai');
        setError(friendlyError);
        throw new Error(friendlyError);
      }

      const { result } = await aiResponse.json();
      setResult(result);
      setError(null);
      
      // Сохраняем результат в кэш
      setCachedResults(prev => ({
        ...prev,
        [cacheKey]: result
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при обработке статьи. Пожалуйста, попробуйте снова.';
      // Если ошибка еще не установлена (не из загрузки статьи), устанавливаем дружественное сообщение
      if (!error || (error instanceof Error && !error.message.startsWith('Не удалось') && !error.message.startsWith('Обработка заняла'))) {
        const friendlyError = getFriendlyError(errorMessage, 'ai');
        if (!error || (error instanceof Error && error.message !== friendlyError)) {
          setError(friendlyError);
        }
      }
      console.error(error);
    } finally {
      setLoading(false);
      setProcessStatus('');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Референт англоязычных статей
            </h1>
            {(url || result || error || articleData) && (
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors self-start sm:self-auto"
                title="Очистить все данные"
              >
                Очистить
              </button>
            )}
          </div>
          
          {/* Поле ввода URL */}
          <div className="mb-6 sm:mb-8">
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
              className="w-full px-4 py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none transition-all"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Укажите ссылку на англоязычную статью
            </p>
          </div>

          {/* Кнопка перевода */}
          {articleData && (
            <div className="mb-4 sm:mb-6">
              <button
                onClick={handleTranslate}
                disabled={loading}
                title="Показать полный перевод статьи"
                className={`w-full px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
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

          {/* Кнопка генерации иллюстрации */}
          {cachedResults.summary && (
            <div className="mb-4 sm:mb-6">
              <button
                onClick={handleGenerateImage}
                disabled={loading}
                title="Сгенерировать иллюстрацию на основе резюме статьи"
                className={`w-full px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  activeButton === 'illustration' && loading
                    ? 'bg-pink-600 ring-4 ring-pink-300'
                    : 'bg-pink-500 hover:bg-pink-600'
                }`}
              >
                {loading && activeButton === 'illustration' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Генерация...
                  </span>
                ) : (
                  'Иллюстрация'
                )}
              </button>
            </div>
          )}

          {/* Информационное сообщение */}
          {url.trim() && !articleData && !loading && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                  <strong>Подсказка:</strong> Нажмите на любую из кнопок ниже — статья загрузится и обработается автоматически. Для доступа к иллюстрации для статьи нажмите кнопку &quot;О чем статья?&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading || !url.trim()}
              className={`w-full px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
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
              className={`w-full px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
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
              className={`w-full px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
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

          {/* Блок ошибок */}
          {error && (
            <div className="mt-6 sm:mt-8">
              <Alert variant="destructive">
                <div className="flex items-start">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="text-sm sm:text-base">Ошибка</AlertTitle>
                    <AlertDescription className="mt-1 text-xs sm:text-sm break-words">
                      {error}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </div>
          )}

          {/* Блок отображения результата */}
          {result && (
            <div ref={resultRef} className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white break-words">
                  {result.startsWith('Ошибка:') ? 'Ошибка' : 
                   activeButton === 'translate' ? 'Перевод статьи:' :
                   activeButton === 'summary' ? 'Резюме статьи:' :
                   activeButton === 'theses' ? 'Тезисы статьи:' :
                   activeButton === 'telegram' ? 'Пост для Telegram:' :
                   articleData ? 'Загруженная статья:' : 'Результат:'}
                </h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  {articleData && !result.startsWith('Ошибка:') && (
                    <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Статья загружена
                    </div>
                  )}
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors flex items-center gap-2 self-start"
                    title="Копировать результат"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Скопировано
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Копировать
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="prose dark:prose-invert max-w-none text-sm sm:text-base">
                <p className={`whitespace-pre-wrap break-words leading-relaxed ${
                  result.startsWith('Ошибка:') 
                    ? 'text-red-700 dark:text-red-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {result}
                </p>
              </div>
            </div>
          )}

          {/* Блок отображения иллюстрации */}
          {generatedImage && (
            <div ref={resultRef} className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Иллюстрация:
                </h2>
                <button
                  onClick={handleCopyImage}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors"
                  title="Копировать изображение"
                >
                  {imageCopied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Скопировано
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Копировать
                    </>
                  )}
                </button>
              </div>
              <div className="flex justify-center">
                <img 
                  src={generatedImage} 
                  alt="Сгенерированная иллюстрация статьи" 
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-2 px-2">
                {!url.trim() 
                  ? 'Введите URL статьи и выберите действие'
                  : !articleData
                  ? 'Загрузите статью или выберите действие для автоматической загрузки'
                  : 'Выберите действие для обработки статьи'}
              </p>
              {articleData && (
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-2 px-2 break-words">
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

