import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { PrismaService } from '../../config/prisma.service';

const MODEL = 'llama-3.3-70b-versatile';

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private groq: Groq;
  private knowledgeBasePrompt = '';

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your-groq-api-key') {
      this.logger.warn('GROQ_API_KEY not set — chat service disabled');
      return;
    }
    this.groq = new Groq({ apiKey });
    await this.loadKnowledgeBase();
    this.logger.log('Chat service initialized with Groq');
  }

  async reloadKnowledgeBase() {
    await this.loadKnowledgeBase();
    this.logger.log('Knowledge base reloaded');
  }

  private async loadKnowledgeBase() {
    const entries = await this.prisma.knowledgeBase.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    this.knowledgeBasePrompt = entries
      .map((e) => `[${e.category}] Q: ${e.question}\nA: ${e.answer}`)
      .join('\n\n');
  }

  private async buildSystemPrompt(): Promise<string> {
    const [routes, trips] = await Promise.all([
      this.prisma.route.findMany({
        where: { isActive: true },
        orderBy: { fromCity: 'asc' },
      }),
      this.prisma.trip.findMany({
        where: {
          status: 'SCHEDULED',
          departureTime: { gte: new Date() },
        },
        include: { route: true, driver: true },
        orderBy: { departureTime: 'asc' },
        take: 20,
      }),
    ]);

    const routeList = routes.length
      ? routes.map((r) => `- ${r.fromCity} → ${r.toCity}: ${r.pricePerKg.toLocaleString('vi-VN')}đ/kg, khoảng ${r.durationHours} tiếng`).join('\n')
      : '(Chưa có tuyến nào)';

    const tripList = trips.length
      ? trips.map((t) => `- ${t.route.fromCity} → ${t.route.toCity}: khởi hành ${new Date(t.departureTime).toLocaleString('vi-VN')}, còn ${(t.capacityKg - t.loadedKg).toFixed(1)}kg trống, ${t.pricePerKg.toLocaleString('vi-VN')}đ/kg (${t.driver.companyName})`).join('\n')
      : '(Không có chuyến sắp tới)';

    return `Bạn là trợ lý hỗ trợ khách hàng của LT-Move — dịch vụ gửi hàng liên tỉnh bằng xe khách.
Nhiệm vụ: trả lời câu hỏi về gửi hàng, giá cước, tuyến xe, và chính sách dịch vụ.

Nguyên tắc:
- Trả lời ngắn gọn, thân thiện bằng tiếng Việt
- Dùng thông tin thực tế bên dưới để trả lời, không bịa thêm
- Nếu không có thông tin, hướng dẫn liên hệ hotline 1900-xxxx

=== TUYẾN VẬN CHUYỂN HIỆN TẠI ===
${routeList}

=== CHUYẾN XE SẮP TỚI ===
${tripList}

=== KIẾN THỨC & CHÍNH SÁCH ===
${this.knowledgeBasePrompt || '(Chưa có dữ liệu)'}`;
  }

  async chat(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<string> {
    if (!this.groq) {
      return 'Tính năng chatbot chưa được cấu hình. Vui lòng liên hệ hotline để được hỗ trợ.';
    }

    try {
      const systemPrompt = await this.buildSystemPrompt();

      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content } as Groq.Chat.ChatCompletionMessageParam)),
        { role: 'user', content: message },
      ];

      const response = await this.groq.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      });

      return response.choices[0].message.content ?? 'Xin lỗi, tôi không thể xử lý yêu cầu này.';
    } catch (err: any) {
      this.logger.error(`Groq error: ${err?.message ?? err}`);
      return 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút.';
    }
  }
}
