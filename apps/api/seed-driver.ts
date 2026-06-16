import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DRIVERS = [
  {
    phone: '0911000001',
    fullName: 'Nguyễn Văn Tài',
    password: 'driver123',
    driverCode: 'TX-001',
    companyName: 'Xe Văn Minh',
    vehiclePlate: '29B-001.23',
    vehicleType: 'Xe giường nằm 40 chỗ',
  },
  {
    phone: '0911000002',
    fullName: 'Trần Thị Hương',
    password: 'driver123',
    driverCode: 'TX-002',
    companyName: 'Phương Trang',
    vehiclePlate: '51A-123.45',
    vehicleType: 'Xe limousine 20 chỗ',
  },
  {
    phone: '0911000003',
    fullName: 'Lê Minh Đức',
    password: 'driver123',
    driverCode: 'TX-003',
    companyName: 'Hoàng Long',
    vehiclePlate: '43C-456.78',
    vehicleType: 'Xe ghế ngồi 45 chỗ',
  },
];

async function main() {
  for (const d of DRIVERS) {
    const existing = await prisma.user.findUnique({ where: { phone: d.phone } });
    if (existing) {
      console.log(`⏭️  Bỏ qua ${d.driverCode} (đã tồn tại: ${d.phone})`);
      continue;
    }

    const hashed = await bcrypt.hash(d.password, 12);
    const user = await prisma.user.create({
      data: {
        phone: d.phone,
        fullName: d.fullName,
        password: hashed,
        role: 'DRIVER',
        isActive: true,
        isVerified: true,
      },
    });

    await prisma.driver.create({
      data: {
        userId: user.id,
        driverCode: d.driverCode,
        companyName: d.companyName,
        vehiclePlate: d.vehiclePlate,
        vehicleType: d.vehicleType,
        isApproved: true,
      },
    });

    console.log(`✅ Tạo tài khoản nhà xe thành công:`);
    console.log(`   Mã tài xế : ${d.driverCode}`);
    console.log(`   Biển số   : ${d.vehiclePlate}`);
    console.log(`   Nhà xe    : ${d.companyName}`);
    console.log(`   Mật khẩu  : ${d.password}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
