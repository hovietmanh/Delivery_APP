import { Injectable, Logger } from '@nestjs/common';

export interface AiVerdict {
  verdict: 'DAMAGED' | 'NOT_DAMAGED' | 'UNCERTAIN';
  confidence: number;
  reason: string;
}

const NON_VISUAL_REASONS = ['thu sai phí', 'thu thiếu tiền', 'thái độ', 'trễ hẹn'];

type AnalysisType = 'identity' | 'physical_damage' | 'wet_dirty' | 'general' | 'non_visual';

function classifyReason(reason: string): AnalysisType {
  const r = reason.toLowerCase();
  if (NON_VISUAL_REASONS.some((k) => r.includes(k))) return 'non_visual';
  if (r.includes('mất') || r.includes('thiếu') || r.includes('sai hàng') || r.includes('thất lạc')) return 'identity';
  if (r.includes('hư hỏng') || r.includes('vỡ') || r.includes('nứt') || r.includes('móp')) return 'physical_damage';
  if (r.includes('ướt') || r.includes('bẩn') || r.includes('mốc')) return 'wet_dirty';
  return 'general';
}

function buildGuide(type: AnalysisType, reason: string): string {
  switch (type) {
    case 'identity':
      return `So sánh hàng lúc NHẬN và lúc GIAO: có phải cùng loại, cùng số lượng không?
→ Khác = DAMAGED | Giống = NOT_DAMAGED | Không đủ ảnh = UNCERTAIN`;
    case 'physical_damage':
      return `Tìm vết nứt, vỡ, móp méo MỚI xuất hiện sau khi lên xe so với ảnh nhận hàng.
→ Có hư hỏng mới = DAMAGED | Nguyên vẹn = NOT_DAMAGED | Không rõ = UNCERTAIN`;
    case 'wet_dirty':
      return `Tìm vết ướt, bẩn MỚI xuất hiện trong vận chuyển so với ảnh nhận hàng.
→ Có dấu hiệu mới = DAMAGED | Còn khô sạch = NOT_DAMAGED | Không rõ = UNCERTAIN`;
    case 'non_visual':
      return `Đánh giá "${reason}" dựa vào mô tả của khách (không cần ảnh).
→ Mô tả cụ thể, hợp lý = DAMAGED | Mơ hồ, không rõ ràng = UNCERTAIN`;
    default:
      return `So sánh tổng thể tình trạng hàng lúc NHẬN và lúc GIAO theo khiếu nại: "${reason}"
→ Bất thường rõ = DAMAGED | Nguyên vẹn = NOT_DAMAGED | Thiếu thông tin = UNCERTAIN`;
  }
}

const MODELS = [
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', vision: true },   // VL model, free
  { id: 'google/gemini-2.5-flash', vision: true },               // tốt nhất, có phí nhỏ
  { id: 'google/gemma-4-31b-it:free', vision: false },           // free, text-only
  { id: 'openai/gpt-oss-20b:free', vision: false },              // free fallback
];

@Injectable()
export class ComplaintAiService {
  private readonly logger = new Logger(ComplaintAiService.name);
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY ?? null;
    if (this.apiKey) {
      this.logger.log('OpenRouter AI complaint analysis ready');
    } else {
      this.logger.warn('OPENROUTER_API_KEY not set — AI analysis disabled');
    }
  }

  async analyzeComplaint(params: {
    loadingPhotos: string[];
    unloadingPhotos: string[];
    customerPhotos: string[];
    description: string;
    reason: string;
  }): Promise<AiVerdict> {
    if (!this.apiKey) {
      return { verdict: 'UNCERTAIN', confidence: 0, reason: 'Chưa cấu hình AI. Khiếu nại sẽ được xử lý thủ công.' };
    }

    const type = classifyReason(params.reason);
    const isVisual = type !== 'non_visual';
    const guide = buildGuide(type, params.reason);

    const photos = isVisual ? [
      ...params.loadingPhotos.slice(0, 2).map(url => ({ url, label: 'Ảnh nhận hàng tại bến' })),
      ...params.unloadingPhotos.slice(0, 2).map(url => ({ url, label: 'Ảnh giao hàng cho khách' })),
      ...params.customerPhotos.slice(0, 1).map(url => ({ url, label: 'Ảnh bằng chứng khách gửi' })),
    ] : [];

    const prompt = `Bạn là chuyên gia giám định hàng hóa vận chuyển.

KHIẾU NẠI: ${params.reason}
MÔ TẢ: ${params.description}
${photos.length > 0 ? `ẢNH: ${photos.map(p => p.label).join(', ')}` : '(Không có ảnh — phân tích dựa trên mô tả)'}

HƯỚNG DẪN:
${guide}

Trả về JSON duy nhất, không thêm text khác:
{"verdict":"DAMAGED"|"NOT_DAMAGED"|"UNCERTAIN","confidence":0.0-1.0,"reason":"giải thích ngắn tiếng Việt dưới 120 ký tự"}`;

    for (const model of MODELS) {
      const canUsePhotos = model.vision && photos.length > 0;

      const content: any[] = [{ type: 'text', text: prompt }];
      if (canUsePhotos) {
        for (const p of photos) {
          content.push({ type: 'image_url', image_url: { url: p.url } });
        }
      }

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://delilog.app',
          },
          body: JSON.stringify({
            model: model.id,
            messages: [{ role: 'user', content }],
            max_tokens: 200,
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(20_000),
        });

        if (!res.ok) {
          const err = await res.text();
          this.logger.warn(`${model.id} failed (${res.status}): ${err.slice(0, 100)}`);
          continue;
        }

        const data = (await res.json()) as any;
        const text: string = data.choices?.[0]?.message?.content ?? '';
        const match = text.match(/\{[\s\S]*?\}/);
        if (!match) {
          this.logger.warn(`${model.id} non-JSON: ${text.slice(0, 100)}`);
          continue;
        }

        const parsed = JSON.parse(match[0]);
        const verdict = ['DAMAGED', 'NOT_DAMAGED', 'UNCERTAIN'].includes(parsed.verdict)
          ? (parsed.verdict as AiVerdict['verdict'])
          : 'UNCERTAIN';

        this.logger.log(`${model.id}: ${verdict} (${Math.round((parsed.confidence ?? 0.5) * 100)}%) — ${parsed.reason}`);
        return {
          verdict,
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
          reason: String(parsed.reason || ''),
        };
      } catch (err: any) {
        this.logger.warn(`${model.id} error: ${err?.message}`);
      }
    }

    return {
      verdict: 'UNCERTAIN',
      confidence: 0,
      reason: 'Không thể phân tích tự động. Khiếu nại sẽ được xử lý thủ công.',
    };
  }
}
