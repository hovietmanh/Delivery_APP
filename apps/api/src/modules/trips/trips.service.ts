import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchTrips(fromCity: string, toCity: string, date?: string) {
    const routes = await this.prisma.route.findMany({
      where: {
        fromCity: { contains: fromCity, mode: 'insensitive' },
        toCity: { contains: toCity, mode: 'insensitive' },
        isActive: true,
      },
    });

    if (!routes.length) return this.getMockTrips(fromCity, toCity);

    const trips = await this.prisma.trip.findMany({
      where: {
        route: { fromCity: { contains: fromCity, mode: 'insensitive' }, toCity: { contains: toCity, mode: 'insensitive' } },
        status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING] },
        ...(date && {
          departureTime: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 86400000),
          },
        }),
      },
      include: {
        route: true,
        driver: { include: { user: { select: { fullName: true } } } },
        _count: { select: { orders: true } },
      },
      orderBy: { departureTime: 'asc' },
    });

    return trips.map((t) => ({
      id: t.id,
      companyName: t.driver.companyName,
      vehicleType: t.driver.vehicleType,
      vehiclePlate: t.driver.vehiclePlate,
      rating: t.driver.rating,
      fromCity: t.route.fromCity,
      fromStation: t.route.fromStation,
      toCity: t.route.toCity,
      toStation: t.route.toStation,
      distanceKm: t.route.distanceKm,
      durationHours: t.route.durationHours,
      pricePerKg: t.pricePerKg,
      departureTime: t.departureTime,
      arrivalEta: t.arrivalEta,
      availableKg: t.capacityKg - t.loadedKg,
      ordersCount: t._count.orders,
    }));
  }

  async getAvailableDrivers(fromCity: string, toCity: string) {
    const drivers = await this.prisma.driver.findMany({
      where: {
        isApproved: true,
        user: { isActive: true },
        todayFromCity: { equals: fromCity, mode: 'insensitive' },
        todayToCity: { equals: toCity, mode: 'insensitive' },
        todayDepartureTime: { not: null },
      },
      orderBy: { rating: 'desc' },
    });

    return drivers.map((d, i) => ({
      id: d.id,
      companyName: d.companyName,
      vehicleType: d.vehicleType,
      vehiclePlate: d.vehiclePlate,
      rating: d.rating,
      totalTrips: d.totalTrips,
      pricePerKg: d.todayPricePerKg ?? 15000,
      departureTime: d.todayDepartureTime,
      isRecommended: i === 0,
    }));
  }

  async getRoutes() {
    return this.prisma.route.findMany({
      where: { isActive: true },
      orderBy: [{ fromCity: 'asc' }, { toCity: 'asc' }],
    });
  }

  async getTrip(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        route: true,
        driver: { include: { user: { select: { fullName: true, phone: true } } } },
        orders: { select: { id: true, trackingCode: true, status: true, senderName: true, receiverName: true } },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private getMockTrips(fromCity: string, toCity: string) {
    const departures = ['06:00', '10:30', '14:00', '18:30', '22:00'];
    return departures.map((dep, i) => ({
      id: `mock-${i}`,
      companyName: i % 2 === 0 ? 'VĂN MINH' : 'PHƯƠNG TRANG',
      vehicleType: i % 2 === 0 ? 'Xe Limousine Giường Nằm' : 'Xe Ghế Ngồi',
      vehiclePlate: `29A-00${i + 1}.23`,
      rating: 4.5 + i * 0.1,
      fromCity,
      toCity,
      fromStation: `Bến xe ${fromCity}`,
      toStation: `Bến xe ${toCity}`,
      distanceKm: 1700,
      durationHours: 24,
      pricePerKg: 15000 + i * 1000,
      departureTime: dep,
      arrivalEta: `+24h`,
      availableKg: 500 - i * 50,
      ordersCount: i * 3,
      features: i % 2 === 0 ? ['Điều hòa', 'Wifi', 'Nước uống'] : ['Điều hòa', 'Giường nằm'],
      isRecommended: i === 0,
    }));
  }
}
