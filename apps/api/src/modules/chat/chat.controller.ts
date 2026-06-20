import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'chat', version: '1' })
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  async chat(@Body() dto: ChatMessageDto, @Request() req: any) {
    const reply = await this.chatService.chat(dto.message, dto.history ?? []);
    return { reply };
  }

  @Post('reload-knowledge')
  @HttpCode(200)
  async reloadKnowledge() {
    await this.chatService.reloadKnowledgeBase();
    return { message: 'Knowledge base reloaded' };
  }
}
