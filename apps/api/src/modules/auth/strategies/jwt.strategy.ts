import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../config/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, phone: true, fullName: true, role: true, isActive: true,
        driver: { select: { driverCode: true, companyName: true, vehiclePlate: true, vehicleType: true, rating: true, totalTrips: true, isApproved: true } },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    const { driver, ...base } = user;
    return driver ? { ...base, ...driver } : base;
  }
}
