import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateCaller } from '../../lib/prospector';

type MessageTone = 'formal' | 'casual' | 'consultive';
type MessageType = 'first_contact' | 'follow_up' | 'proposal' | 'closing';

interface ProspectInfo {
  contactName: string;
  contactTitle: string | null;
  companyName: string;
  industry: string | null;
  companySize: string | null;
  city: string | null;
  country: string | null;
  scoreLabel: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateCaller(req);
  } catch (e: any) {
    return res.status(401).json({ error: e.message });
  }

  const { prospect, messageType, tone, additionalContext, interactionHistory } = req.body as {
    prospect: ProspectInfo;
    messageType: MessageType;
    tone: MessageTone;
    additionalContext?: string;
    interactionHistory?: string;
  };

  if (!prospect || !messageType || !tone) {
    return res.status(400).json({ error: 'prospect, messageType, and tone are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const toneMap: Record<MessageTone, string> = {
    formal: 'Usa un tono profesional y formal.',
    casual: 'Usa un tono amigable y cercano.',
    consultive: 'Usa un tono consultivo, posicionate como experto.',
  };

  const typeMap: Record<MessageType, string> = {
    first_contact: 'Escribe un email de primer contacto / cold outreach personalizado.',
    follow_up: 'Escribe un email de seguimiento basado en interacciones previas.',
    proposal: 'Escribe un email de propuesta de valor.',
    closing: 'Escribe un email de cierre para avanzar el deal.',
  };

  const prompt = `Eres un experto en ventas B2B. Genera un email de ventas en español.

PROSPECTO:
- Nombre: ${prospect.contactName}
- Cargo: ${prospect.contactTitle || 'Desconocido'}
- Empresa: ${prospect.companyName}
- Industria: ${prospect.industry || 'Desconocida'}
- Tamaño: ${prospect.companySize || 'Desconocido'}
- Ubicacion: ${prospect.city || ''} ${prospect.country || ''}
- Score: ${prospect.scoreLabel}

HISTORIAL:
${interactionHistory || 'Sin interacciones previas'}

INSTRUCCIONES:
${typeMap[messageType]}
${toneMap[tone]}
${additionalContext ? `Contexto adicional: ${additionalContext}` : ''}

Responde SOLO con un JSON: {"subject": "asunto del email", "body": "cuerpo del email"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${errText}` });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';
    const parsed = JSON.parse(text);

    return res.status(200).json({
      subject: parsed.subject || '',
      body: parsed.body || '',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
