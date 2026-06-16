import {
  Controller,
  Get,
  Put,
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
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'driver', version: '1' })
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Driver dashboard stats' })
  getStats(@Request() req: any) {
    return this.driversService.getStats(req.user.id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders (PENDING=available, others=my orders)' })
  getOrders(@Request() req: any, @Query('status') status?: string) {
    return this.driversService.getOrders(req.user.id, status);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrder(@Request() req: any, @Param('id') id: string) {
    return this.driversService.getOrder(req.user.id, id);
  }

  @Patch('orders/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept order — assigns to driver trip' })
  acceptOrder(@Request() req: any, @Param('id') id: string) {
    return this.driversService.acceptOrder(req.user.id, id);
  }

  @Patch('orders/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject order' })
  rejectOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.driversService.rejectOrder(req.user.id, id, reason);
  }

  @Patch('orders/:id/pickup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm pickup with photos' })
  confirmPickup(
    @Request() req: any,
    @Param('id') id: string,
    @Body('photos') photos: string[],
  ) {
    return this.driversService.confirmPickup(req.user.id, id, photos);
  }

  @Patch('orders/:id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm delivery — photos + signature + COD' })
  confirmDelivery(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { photos: string[]; signature: string; codCollected?: number },
  ) {
    return this.driversService.confirmDelivery(req.user.id, id, body);
  }

  @Get('trip/active')
  @ApiOperation({ summary: 'Get active trip with all orders' })
  getActiveTrip(@Request() req: any) {
    return this.driversService.getActiveTrip(req.user.id);
  }

  @Patch('trip/:tripId/checkpoint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update trip checkpoint (DEPARTED | MIDPOINT | ARRIVED_STATION)' })
  updateTripCheckpoint(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body('checkpoint') checkpoint: string,
  ) {
    return this.driversService.updateTripCheckpoint(req.user.id, tripId, checkpoint);
  }

  @Get('today-route')
  @ApiOperation({ summary: 'Get today route info' })
  getTodayRoute(@Request() req: any) {
    return this.driversService.getTodayRoute(req.user.id);
  }

  @Put('today-route')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set today route (fromCity, toCity, departureTime, pricePerKg)' })
  updateTodayRoute(
    @Request() req: any,
    @Body() body: { fromCity: string; toCity: string; departureTime: string; pricePerKg?: number },
  ) {
    return this.driversService.updateTodayRoute(req.user.id, body);
  }

  @Put('today-route/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear today route' })
  clearTodayRoute(@Request() req: any) {
    return this.driversService.clearTodayRoute(req.user.id);
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get my admin-assigned static routes' })
  getMyRoutes(@Request() req: any) {
    return this.driversService.getMyRoutes(req.user.id);
  }

  @Get('complaints')
  @ApiOperation({ summary: 'List complaints on my orders' })
  getComplaints(@Request() req: any) {
    return this.driversService.getComplaints(req.user.id);
  }

  @Patch('complaints/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a complaint' })
  respondComplaint(
    @Request() req: any,
    @Param('id') id: string,
    @Body('response') response: string,
  ) {
    return this.driversService.respondComplaint(req.user.id, id, response);
  }
}
