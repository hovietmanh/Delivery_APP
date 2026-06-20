import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Customer creates a new order' })
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createWithPayment(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get orders for current user (role-aware)' })
  findMyOrders(@Request() req: any, @Query('status') status?: string) {
    return this.ordersService.findByUser(req.user.id, req.user.role, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Admin: get order statistics' })
  getStats() {
    return this.ordersService.getAdminStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id or trackingCode' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer cancels an order' })
  cancel(@Param('id') id: string, @Request() req: any, @Body('reason') reason?: string) {
    return this.ordersService.cancel(id, req.user.id, reason);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Customer submits a review for a delivered order' })
  createReview(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.ordersService.createReview(req.user.id, id, body);
  }

  @Get(':id/review')
  @ApiOperation({ summary: 'Get review for an order' })
  getReview(@Param('id') id: string) {
    return this.ordersService.getReview(id);
  }

  @Post(':id/complaint')
  @ApiOperation({ summary: 'Customer files a complaint for a delivered order' })
  createComplaint(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.ordersService.createComplaint(req.user.id, id, body);
  }

  @Get(':id/complaint')
  @ApiOperation({ summary: 'Get complaint for an order' })
  getComplaint(@Param('id') id: string) {
    return this.ordersService.getComplaint(id);
  }

  @Post(':id/complaint/dispute-ai')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer disputes AI verdict — notifies driver for manual review' })
  disputeAiResult(@Param('id') id: string, @Request() req: any, @Body('reason') reason: string) {
    return this.ordersService.disputeAiResult(req.user.id, id, reason);
  }

  @Post(':id/complaint/reanalyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-trigger AI analysis for a complaint' })
  reanalyzeComplaint(@Param('id') id: string) {
    return this.ordersService.reanalyzeComplaint(id);
  }

  @Patch(':id/complaint/resolve')
  @ApiOperation({ summary: 'Driver resolves complaint (FAULT or NO_FAULT)' })
  resolveComplaint(@Param('id') id: string, @Request() req: any, @Body() body: { verdict: 'FAULT' | 'NO_FAULT'; message: string }) {
    return this.ordersService.resolveComplaint(req.user.id, id, body);
  }

  @Patch(':id/complaint/bank-info')
  @ApiOperation({ summary: 'Customer submits bank account for refund' })
  submitBankInfo(@Param('id') id: string, @Request() req: any, @Body('bankAccount') bankAccount: string) {
    return this.ordersService.submitBankInfo(req.user.id, id, bankAccount);
  }

  @Patch(':id/complaint/confirm-transfer')
  @ApiOperation({ summary: 'Driver confirms money has been transferred' })
  confirmTransfer(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.confirmTransfer(req.user.id, id);
  }
}
