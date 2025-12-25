import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Hugging Face API key is not configured' },
        { status: 500 }
      );
    }

    // Используем модели, которые точно работают через Inference API
    // Пробуем несколько моделей для надежности
    const models = [
      'black-forest-labs/FLUX.1-dev',
      'stabilityai/stable-diffusion-xl-base-1.0',
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1',
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        // Используем новый router API с правильным форматом
        // Формат: https://router.huggingface.co/hf-inference/models/{model_id}
        const apiUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
        
        console.log(`Trying model: ${model} with router API`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_inference_steps: 30,
              guidance_scale: 7.5,
            },
          }),
        });

        // Проверяем тип контента ответа
        const contentType = response.headers.get('content-type');
        console.log(`Model ${model} - Response status:`, response.status);
        console.log(`Model ${model} - Response content-type:`, contentType);

        if (!response.ok) {
          let errorData;
          try {
            const text = await response.text();
            console.error(`Model ${model} - Error response:`, text);
            
            // Если получаем сообщение о перенаправлении на router API
            if (text.includes('router.huggingface.co')) {
              // Используем правильный формат для нового router API
              const routerUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
              console.log(`Trying router API with correct format: ${routerUrl}`);
              
              const routerResponse = await fetch(routerUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  inputs: prompt,
                  parameters: {
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                  },
                }),
              });

              if (routerResponse.ok) {
                const imageBlob = await routerResponse.blob();
                if (imageBlob.type && imageBlob.type.startsWith('image/')) {
                  const arrayBuffer = await imageBlob.arrayBuffer();
                  const base64 = Buffer.from(arrayBuffer).toString('base64');
                  const mimeType = imageBlob.type || 'image/png';

                  console.log(`Successfully generated image with model: ${model} using router API`);
                  return NextResponse.json({
                    image: `data:${mimeType};base64,${base64}`,
                  });
                }
              } else {
                console.log(`Router API also failed with status: ${routerResponse.status}`);
              }
            }
            
            try {
              errorData = JSON.parse(text);
            } catch {
              errorData = { error: text || response.statusText };
            }
          } catch (e) {
            errorData = { error: response.statusText || 'Unknown error' };
          }
          
          // Если модель загружается, пробуем следующую
          if (response.status === 503) {
            console.log(`Model ${model} is loading, trying next model...`);
            lastError = { 
              error: 'Модель загружается. Пожалуйста, подождите несколько секунд и попробуйте снова.',
              errorType: 'model_loading'
            };
            continue; // Пробуем следующую модель
          }
          
          // Если ошибка авторизации, не пробуем другие модели
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json(
              { 
                error: 'Ошибка авторизации. Проверьте правильность API ключа Hugging Face.',
                errorType: 'auth_error'
              },
              { status: response.status }
            );
          }
          
          // Если 410 (Gone), значит API устарел, но мы уже попробовали router
          if (response.status === 410) {
            console.log(`API endpoint deprecated for ${model}, will try next model`);
            lastError = { error: 'Этот API endpoint больше не поддерживается' };
            continue;
          }
          
          lastError = errorData;
          continue; // Пробуем следующую модель
        }

        // Пытаемся получить изображение
        try {
          const imageBlob = await response.blob();
          
          // Проверяем, что это действительно изображение
          if (!imageBlob.type || !imageBlob.type.startsWith('image/')) {
            // Если это не изображение, пытаемся прочитать как текст для диагностики
            const text = await imageBlob.text();
            console.error(`Model ${model} - Unexpected response type:`, imageBlob.type, 'Body preview:', text.substring(0, 200));
            lastError = { error: 'Сервер вернул не изображение' };
            continue; // Пробуем следующую модель
          }
          
          const arrayBuffer = await imageBlob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = imageBlob.type || 'image/png';

          console.log(`Successfully generated image with model: ${model}`);
          return NextResponse.json({
            image: `data:${mimeType};base64,${base64}`,
          });
        } catch (blobError) {
          console.error(`Model ${model} - Error reading blob:`, blobError);
          lastError = { error: 'Ошибка при обработке изображения' };
          continue; // Пробуем следующую модель
        }
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        lastError = error;
        continue;
      }
    }

    // Если все модели не сработали, возвращаем последнюю ошибку
    if (lastError?.errorType === 'model_loading') {
      return NextResponse.json(
        { 
          error: lastError.error,
          errorType: 'model_loading'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: lastError?.error || 'Не удалось сгенерировать изображение. Все модели недоступны. Возможно, требуется обновление API или использование другого сервиса.',
        errorType: 'generation_error',
        details: lastError
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        errorType: 'generation_error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
