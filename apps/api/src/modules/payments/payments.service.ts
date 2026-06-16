import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// Thông tin tài khoản ngân hàng của công ty (cấu hình cứng cho demo)
const COMPANY_BANK = {
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '1234567890',
  accountName: 'CONG TY TNHH DELILOG',
};

// Tạo mã tham chiếu 8 ký tự viết hoa
function genReferenceCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Khởi tạo thanh toán sau khi tạo đơn hàng ─────────────────────────────
  async initiatePayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.payment.findUnique({ where: { orderId } });
    if (existing) {
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException('Order is already paid');
      }
      return existing; // Trả về payment đang pending
    }

    const referenceCode = `DL${genReferenceCode()}`;
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // Hết hạn 15 phút

    switch (order.paymentMethod) {
      case PaymentMethod.CASH_AT_STATION:
        return this.initiateCashPayment(orderId, order.total, referenceCode);

      case PaymentMethod.BANK_TRANSFER:
        return this.initiateBankTransfer(orderId, order.total, referenceCode, expiredAt);

      case PaymentMethod.VIET_QR:
        return this.initiateVietQR(orderId, order.total, referenceCode, order.trackingCode, expiredAt);

      case PaymentMethod.MOMO:
        return this.initiateMoMo(orderId, order.total, referenceCode, order.trackingCode, expiredAt);

      default:
        throw new BadRequestException('Unsupported payment method');
    }
  }

  // ─── CASH AT STATION ────────────────────────────────────────────────────────
  // Khách mang hàng ra bến và trả tiền mặt tại quầy → tự động xác nhận
  private async initiateCashPayment(orderId: string, amount: number, referenceCode: string) {
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.CASH_AT_STATION,
        status: PaymentStatus.AWAITING_CONFIRMATION,
        amount,
        referenceCode,
        bankName: null,
      },
    });

    return { ...payment, instructions: 'Vui lòng thanh toán tiền mặt tại quầy nhà xe khi mang hàng đến bến.' };
  }

  // ─── BANK TRANSFER ──────────────────────────────────────────────────────────
  // Trả về thông tin tài khoản + nội dung chuyển khoản
  private async initiateBankTransfer(
    orderId: string,
    amount: number,
    referenceCode: string,
    expiredAt: Date,
  ) {
    return this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.AWAITING_CONFIRMATION,
        amount,
        referenceCode,
        expiredAt,
        ...COMPANY_BANK,
      },
    });
  }

  // ─── VIET QR ────────────────────────────────────────────────────────────────
  // Dùng API miễn phí img.vietqr.io — không cần API key
  private async initiateVietQR(
    orderId: string,
    amount: number,
    referenceCode: string,
    trackingCode: string,
    expiredAt: Date,
  ) {
    const addInfo = encodeURIComponent(`${referenceCode} ${trackingCode}`);
    const accountName = encodeURIComponent(COMPANY_BANK.accountName);
    const qrUrl = `https://img.vietqr.io/image/${COMPANY_BANK.bankCode}-${COMPANY_BANK.accountNumber}-qr_only.png?amount=${Math.round(amount)}&addInfo=${addInfo}&accountName=${accountName}`;

    return this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.VIET_QR,
        status: PaymentStatus.AWAITING_CONFIRMATION,
        amount,
        referenceCode,
        expiredAt,
        qrUrl,
        ...COMPANY_BANK,
      },
    });
  }

  // ─── MOMO ───────────────────────────────────────────────────────────────────
  // Tích hợp MoMo — hiện tại dùng deep link (demo). Thay bằng MoMo API khi có key thật.
  private async initiateMoMo(
    orderId: string,
    amount: number,
    referenceCode: string,
    trackingCode: string,
    expiredAt: Date,
  ) {
    // Deep link mở app MoMo với số tiền (hoạt động trên thiết bị thật có MoMo)
    const momoOrderId = `${referenceCode}-${Date.now()}`;
    const momoPayUrl = `momo://app/payment?amount=${Math.round(amount)}&orderId=${momoOrderId}&orderInfo=${encodeURIComponent('Thanh toan don hang ' + trackingCode)}&redirectUrl=delilog://payment/result&ipnUrl=https://delilog.vn/api/v1/payments/momo/callback`;

    return this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.MOMO,
        status: PaymentStatus.PROCESSING,
        amount,
        referenceCode,
        expiredAt,
        momoOrderId,
        momoPayUrl,
      },
    });
  }

  // ─── Lấy thông tin payment của đơn hàng ────────────────────────────────────
  async getPaymentByOrder(orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ─── Xác nhận thanh toán thủ công (staff / admin) ──────────────────────────
  async confirmPayment(orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Payment is already confirmed');
    }

    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.PAID, confirmedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      }),
    ]);

    return updatedPayment;
  }

  // ─── Webhook callback từ MoMo ───────────────────────────────────────────────
  async handleMomoCallback(data: any) {
    const { orderId, resultCode, transId } = data;

    const payment = await this.prisma.payment.findFirst({
      where: { momoOrderId: { contains: orderId } },
    });
    if (!payment) return { message: 'Payment not found' };

    // resultCode = 0 là thành công theo MoMo docs
    const success = resultCode === 0 || resultCode === '0';

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: success ? PaymentStatus.PAID : PaymentStatus.FAILED,
          confirmedAt: success ? new Date() : null,
          providerData: data,
        },
      }),
      ...(success
        ? [this.prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.PAID },
          })]
        : []),
    ]);

    return { message: success ? 'Payment confirmed' : 'Payment failed' };
  }

  // ─── Hoàn tiền ──────────────────────────────────────────────────────────────
  async refundPayment(orderId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    return this.prisma.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.REFUNDED,
        providerData: { ...(payment.providerData as any ?? {}), refundReason: reason },
      },
    });
  }
}
