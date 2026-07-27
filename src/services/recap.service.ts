import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ChapterForRecap {
  title: string;
  content: string;
  order_number: number;
}

function stripDeltaFormatting(deltaContent: string): string {
  try {
    const parsed = JSON.parse(deltaContent);
    if (Array.isArray(parsed)) {
      return parsed
        .map((op: any) => {
          if (typeof op.insert === 'string') return op.insert;
          if (op.insert && typeof op.insert === 'object') return '[imagen]';
          return '';
        })
        .join('');
    }
    return deltaContent;
  } catch {
    return deltaContent;
  }
}

function truncateToProgress(fullText: string, progress: number): string {
  if (progress >= 1) return fullText;
  const targetLength = Math.floor(fullText.length * progress);
  if (targetLength <= 0) return fullText.substring(0, 500);
  const cutPoint = fullText.lastIndexOf(' ', targetLength);
  return fullText.substring(0, cutPoint > targetLength - 100 ? cutPoint : targetLength);
}

export async function generateRecap(
  previousChapter: ChapterForRecap | null,
  currentChapter: ChapterForRecap,
  currentProgress: number
): Promise<string> {
  const parts: string[] = [];

  if (previousChapter) {
    const prevText = stripDeltaFormatting(previousChapter.content);
    parts.push(`--- CAPÍTULO ANTERIOR: "${previousChapter.title}" ---\n${prevText}`);
  }

  const currFullText = stripDeltaFormatting(currentChapter.content);
  const currText = truncateToProgress(currFullText, currentProgress);
  const progressPercent = Math.round(currentProgress * 100);
  parts.push(`--- CAPÍTULO ACTUAL: "${currentChapter.title}" (has leído el ${progressPercent}%) ---\n${currText}`);

  const userContent = parts.join('\n\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Eres un narrador experto y empático. Tu tarea es hacer un resumen de recapitulación para un lector que vuelve a una historia después de unos días.

Reglas:
- Resume en 4-10 párrafos lo que ha pasado hasta ahora
- Sé conciso pero incluye: eventos principales, personajes involucrados, conflictos y desarrollo de trama
- Usa un tono engaging que mantenga al lector interesado en continuar
- NO reveles lo que viene después del punto donde se quedó
- Si hay un capítulo anterior y el actual, conecta ambos en el resumen
- Si solo hay un capítulo, resume ese
- Escribe en español`
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    max_tokens: 1024,
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || 'No se pudo generar el resumen.';
}
