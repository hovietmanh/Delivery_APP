import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintAiService } from './complaint-ai.service';

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService, ComplaintAiService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
