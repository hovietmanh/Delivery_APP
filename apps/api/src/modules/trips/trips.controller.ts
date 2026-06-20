import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { TrackingService } from '../tracking/tracking.service';

@ApiTags('Trips')
@Controller({ path: 'trips', version: '1' })
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly trackingGateway: TrackingGateway,
    private readonly trackingService: TrackingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search available trips by route' })
  @ApiQuery({ name: 'fromCity', required: true })
  @ApiQuery({ name: 'toCity', required: true })
  @ApiQuery({ name: 'date', required: false })
  search(
    @Query('fromCity') fromCity: string,
    @Query('toCity') toCity: string,
    @Query('date') date?: string,
  ) {
    return this.tripsService.searchTrips(fromCity, toCity, date);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get drivers registered for a route' })
  @ApiQuery({ name: 'fromCity', required: true })
  @ApiQuery({ name: 'toCity', required: true })
  getAvailableDrivers(
    @Query('fromCity') fromCity: string,
    @Query('toCity') toCity: string,
  ) {
    return this.tripsService.getAvailableDrivers(fromCity, toCity);
  }

  @Get('routes')
  @ApiOperation({ summary: 'List all active routes' })
  getRoutes() {
    return this.tripsService.getRoutes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip detail' })
  getTrip(@Param('id') id: string) {
    return this.tripsService.getTrip(id);
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get current driver GPS location for a trip' })
  async getTripLocation(@Param('id') tripId: string) {
    // Ưu tiên in-memory (realtime), fallback về DB
    const live = this.trackingGateway.getLatestLocation(tripId);
    if (live) return live;
    return this.trackingService.getLatestLocationFromDb(tripId);
  }

  @Get(':id/location-history')
  @ApiOperation({ summary: 'Get GPS location history for route replay' })
  @ApiQuery({ name: 'minutes', required: false, description: 'Lịch sử bao nhiêu phút gần nhất (mặc định 60)' })
  getLocationHistory(@Param('id') tripId: string, @Query('minutes') minutes?: string) {
    return this.trackingService.getLocationHistory(tripId, minutes ? parseInt(minutes) : 60);
  }
}
