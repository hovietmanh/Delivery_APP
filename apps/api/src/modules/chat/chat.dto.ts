import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString() @IsNotEmpty()
  message: string;

  @IsOptional() @IsArray()
  history?: { role: 'user' | 'assistant'; content: string }[];
}
