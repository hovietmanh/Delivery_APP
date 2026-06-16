import {
  Controller, Post, Get, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for an order' })
  initiate(@Body('orderId') orderId: string) {
    return this.paymentsService.initiatePayment(orderId);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment info for an order' })
  getPayment(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }

  @Post(':orderId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually confirm payment (staff/admin)' })
  confirm(@Param('orderId') orderId: string) {
    return this.paymentsService.confirmPayment(orderId);
  }

  // Không cần auth — MoMo server gọi callback này
  @Post('momo/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo payment callback webhook' })
  momoCallback(@Body() data: any) {
    return this.paymentsService.handleMomoCallback(data);
  }

  @Post(':orderId/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a paid order (admin)' })
  refund(@Param('orderId') orderId: string, @Body('reason') reason: string) {
    return this.paymentsService.refundPayment(orderId, reason);
  }
}
