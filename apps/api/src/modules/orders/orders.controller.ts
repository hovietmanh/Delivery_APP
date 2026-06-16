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
}
