import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';

@ApiTags('Trips')
@Controller({ path: 'trips', version: '1' })
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

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
}
