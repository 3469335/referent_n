# referent_n
Референт англоязычных статей на основе ИИ

Описание проекта в файле PROJECT.md

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## Деплой на Vercel

### Способ 1: Через Vercel CLI

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Войдите в аккаунт:
```bash
vercel login
```

3. Деплой:
```bash
vercel
```

### Способ 2: Через GitHub (рекомендуется)

1. Загрузите проект в GitHub репозиторий
2. Перейдите на [vercel.com](https://vercel.com)
3. Нажмите "Add New Project"
4. Импортируйте ваш GitHub репозиторий
5. Vercel автоматически определит Next.js проект
6. Нажмите "Deploy"

### Способ 3: Через веб-интерфейс Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Загрузите папку проекта или подключите Git репозиторий
4. Vercel автоматически настроит проект

## Переменные окружения

Если в будущем понадобятся переменные окружения (например, API ключи), добавьте их в настройках проекта на Vercel:
- Settings → Environment Variables

## Технологии

- **Next.js 14** - React фреймворк
- **TypeScript** - Типизация
- **Tailwind CSS** - Стилизация
- **Vercel** - Хостинг и деплой