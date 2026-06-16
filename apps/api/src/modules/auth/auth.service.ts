import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('Phone number already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        password: hashed,
        fullName: dto.fullName,
        role: dto.role ?? Role.CUSTOMER,
        customer:
          dto.role !== Role.DRIVER ? { create: {} } : undefined,
      },
      select: { id: true, phone: true, fullName: true, role: true },
    });

    return { message: 'Registration successful', user };
  }

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });

    return { accessToken, refreshToken, user };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user?.refreshToken) throw new UnauthorizedException();
      const valid = await bcrypt.compare(token, user.refreshToken);
      if (!valid) throw new UnauthorizedException();
      return this.login(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async loginDriver(driverCode: string, vehiclePlate: string, password: string) {
    // Normalize: uppercase, remove dots/spaces for flexible matching
    const normalizeCode = (s: string) => s.toUpperCase().trim();
    const normalizePlate = (s: string) => s.toUpperCase().replace(/[\s.]/g, '').trim();

    const candidates = await this.prisma.driver.findMany({
      where: { driverCode: normalizeCode(driverCode) },
      include: { user: true },
    });
    const driver = candidates.find(
      d => normalizePlate(d.vehiclePlate) === normalizePlate(vehiclePlate),
    );
    if (!driver) throw new UnauthorizedException('Mã tài xế hoặc biển số xe không đúng');

    const valid = await bcrypt.compare(password, driver.user.password);
    if (!valid) throw new UnauthorizedException('Mật khẩu không đúng');
    if (!driver.user.isActive) throw new UnauthorizedException('Tài khoản đã bị khóa, liên hệ admin');

    const { password: _, ...userWithoutPw } = driver.user;
    return this.login({ ...userWithoutPw, driverCode: driver.driverCode, companyName: driver.companyName, vehiclePlate: driver.vehiclePlate });
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }
}
