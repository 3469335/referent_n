# План реализации функций кнопок AI-обработки статей

## Анализ требований (PROJECT.md)

Приложение должно:
1. Получать URL англоязычной статьи
2. Выполнять парсинг статьи
3. По нажатию кнопки подключать AI и выполнять соответствующее действие
4. Отображать результат в блоке результатов

Три кнопки для реализации:
- **"О чем статья?"** - краткое описание/резюме статьи
- **"Тезисы"** - основные тезисы/ключевые моменты статьи
- **"Пост для Telegram"** - форматированный пост для публикации в Telegram

## Текущее состояние

✅ Реализовано:
- Парсинг статьи (API `/api/parse`)
- Загрузка статьи с отображением в интерфейсе
- Перевод статьи через OpenRouter AI (API `/api/translate`)
- Интерфейс с тремя кнопками (заглушки)

❌ Требуется реализация:
- Функциональность кнопки "О чем статья?"
- Функциональность кнопки "Тезисы"
- Функциональность кнопки "Пост для Telegram"

## План действий

### Этап 1: Создание универсального API route для AI-обработки

**Файл:** `app/api/ai-process/route.ts`

**Задачи:**
1. Создать API endpoint `/api/ai-process`
2. Принимать параметры:
   - `text` - текст статьи для обработки
   - `action` - тип действия: `'summary' | 'theses' | 'telegram'`
3. Использовать OpenRouter AI API (как в `/api/translate`)
4. Использовать модель `deepseek/deepseek-chat`
5. API ключ из переменной окружения `OPENROUTER_API_KEY`

**Структура промптов для каждого действия:**

#### 1.1. Промпт для "О чем статья?" (summary)
```
System: You are an expert article summarizer. Provide a concise summary of the article in Russian. Focus on the main topic, key points, and conclusions. Keep it brief (2-3 paragraphs).

User: Summarize the following article in Russian:
[текст статьи]
```

#### 1.2. Промпт для "Тезисы" (theses)
```
System: You are an expert at extracting key points from articles. Create a list of main theses/key points from the article in Russian. Format as bullet points. Be concise and focus on the most important ideas.

User: Extract the main theses from the following article in Russian:
[текст статьи]
```

#### 1.3. Промпт для "Пост для Telegram" (telegram)
```
System: You are a social media content creator. Create an engaging Telegram post in Russian based on the article. Include:
- Catchy headline/emoji
- Brief summary (2-3 sentences)
- Key points (bullet format)
- Call to action or conclusion
Format it for Telegram (use emojis, line breaks, hashtags if appropriate).

User: Create a Telegram post in Russian based on the following article:
[текст статьи]
```

**Обработка ошибок:**
- Валидация входных данных
- Проверка наличия API ключа
- Обработка ошибок OpenRouter API
- Логирование ошибок

---

### Этап 2: Обновление функции handleSubmit в компоненте

**Файл:** `app/page.tsx`

**Задачи:**
1. Изменить логику `handleSubmit`:
   - Убрать заглушку с `setTimeout`
   - Проверять наличие `articleData` (статья должна быть загружена)
   - Если статья не загружена, сначала загружать её через `/api/parse`
   - После загрузки вызывать `/api/ai-process` с соответствующим `action`

2. Логика работы:
   ```
   Если articleData существует:
     - Использовать articleData.content для обработки
   Иначе:
     - Сначала загрузить статью через /api/parse
     - Сохранить в articleData
     - Затем обработать через /api/ai-process
   ```

3. Формирование текста для обработки:
   - Включить заголовок и содержание статьи
   - Формат: `Title: {title}\n\nContent:\n{content}`

4. Обработка ответа:
   - Получить результат от API
   - Отобразить в блоке результатов
   - Обработать ошибки с понятными сообщениями

---

### Этап 3: Обновление интерфейса (опционально)

**Файл:** `app/page.tsx`

**Задачи:**
1. Улучшить UX:
   - Показывать индикатор загрузки для каждого действия
   - Обновить текст кнопок при загрузке
   - Добавить подсказки, если статья не загружена

2. Валидация:
   - Проверять наличие URL перед обработкой
   - Показывать предупреждение, если статья не загружена

---

### Этап 4: Тестирование

**Задачи:**
1. Протестировать каждую кнопку:
   - "О чем статья?" - проверить формат резюме
   - "Тезисы" - проверить формат списка тезисов
   - "Пост для Telegram" - проверить формат поста

2. Тестирование сценариев:
   - Статья уже загружена → обработка
   - Статья не загружена → загрузка + обработка
   - Ошибка парсинга → обработка ошибки
   - Ошибка AI API → обработка ошибки
   - Некорректный URL → валидация

3. Проверить производительность:
   - Время ответа API
   - Обработка длинных статей
   - Таймауты

---

### Этап 5: Оптимизация и улучшения

**Задачи:**
1. Кэширование (опционально):
   - Кэшировать результаты обработки для одной статьи
   - Избегать повторных запросов к AI

2. Улучшение промптов:
   - Тестировать разные формулировки
   - Оптимизировать для лучших результатов

3. Обработка длинных статей:
   - Разбивать на части, если статья слишком длинная
   - Обрабатывать по частям и объединять результаты

---

## Порядок реализации

1. **Создать API route** `/app/api/ai-process/route.ts`
   - Реализовать базовую структуру
   - Добавить промпты для всех трех действий
   - Протестировать с одним действием

2. **Обновить handleSubmit** в `app/page.tsx`
   - Интегрировать вызов нового API
   - Добавить логику загрузки статьи при необходимости
   - Протестировать каждую кнопку

3. **Тестирование и отладка**
   - Проверить все сценарии
   - Исправить ошибки
   - Оптимизировать промпты

4. **Финальная проверка**
   - Проверить работу всех трех кнопок
   - Убедиться в корректности форматов вывода
   - Проверить обработку ошибок

---

## Технические детали

### Используемые технологии:
- **Next.js 14** - API Routes
- **OpenRouter AI** - API для AI-обработки
- **Deepseek Chat** - модель AI
- **TypeScript** - типизация

### Переменные окружения:
- `OPENROUTER_API_KEY` - ключ API OpenRouter (уже настроен)

### Структура API запроса:
```typescript
POST /api/ai-process
Body: {
  text: string;
  action: 'summary' | 'theses' | 'telegram';
}
Response: {
  result: string;
}
```

### Структура OpenRouter API запроса:
```typescript
POST https://openrouter.ai/api/v1/chat/completions
Headers: {
  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  Content-Type: 'application/json',
  HTTP-Referer: string,
  X-Title: string
}
Body: {
  model: 'deepseek/deepseek-chat',
  messages: Array<{role: string, content: string}>,
  temperature: number
}
```

---

## Критерии успеха

✅ Все три кнопки работают корректно
✅ Результаты отображаются в правильном формате
✅ Обработка ошибок работает корректно
✅ Интерфейс показывает состояние загрузки
✅ Код соответствует стандартам проекта

