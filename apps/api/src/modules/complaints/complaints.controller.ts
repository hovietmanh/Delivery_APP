import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'complaints', version: '1' })
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.create(req.user.customerId, dto);
  }

  @Get()
  listMine(@Request() req: any) {
    return this.complaintsService.listMyComplaints(req.user.customerId);
  }

  @Get(':orderId')
  getOne(@Request() req: any, @Param('orderId') orderId: string) {
    return this.complaintsService.getMyComplaint(req.user.customerId, orderId);
  }
}
