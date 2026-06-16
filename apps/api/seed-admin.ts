import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '0900000000';
  const password = 'admin123';

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log('Admin đã tồn tại:', existing.phone, '| role:', existing.role);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      phone,
      password: hashed,
      fullName: 'Super Admin',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ Tạo admin thành công!');
  console.log('   SĐT:', admin.phone);
  console.log('   Mật khẩu: admin123');
  console.log('   Role:', admin.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
