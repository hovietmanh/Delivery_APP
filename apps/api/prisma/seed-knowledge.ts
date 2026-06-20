import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const entries = [
  // ── FAQ ──────────────────────────────────────────────────────────────────
  {
    category: 'FAQ',
    question: 'Thời gian giao hàng từ Hà Nội vào TP.HCM mất bao lâu?',
    answer: 'Tuyến Hà Nội – TP.HCM mất khoảng 28–32 tiếng tuỳ nhà xe. Xe thường khởi hành lúc 18:00–20:00 và đến nơi sáng hôm sau hoặc ngày kế tiếp.',
  },
  {
    category: 'FAQ',
    question: 'Cách tính giá cước gửi hàng như thế nào?',
    answer: 'Giá cước = trọng lượng (kg) × đơn giá/kg theo tuyến. Ngoài ra có thể phát sinh phí lấy tận nhà, phí giao tận nơi, phí bảo hiểm hàng hoá nếu bạn chọn.',
  },
  {
    category: 'FAQ',
    question: 'Tôi có thể gửi tối đa bao nhiêu kg?',
    answer: 'Không giới hạn trọng lượng tối đa, nhưng một đơn hàng tối đa 200kg. Hàng trên 200kg cần liên hệ nhà xe để thoả thuận riêng.',
  },
  {
    category: 'FAQ',
    question: 'Làm sao để tra cứu đơn hàng của tôi?',
    answer: 'Bạn có thể tra cứu bằng mã vận đơn ngay trong ứng dụng tại tab "Đơn hàng", hoặc hỏi tôi: "Đơn [mã vận đơn] đang ở đâu?"',
  },
  {
    category: 'FAQ',
    question: 'Tôi có thể huỷ đơn hàng không?',
    answer: 'Bạn có thể huỷ đơn khi trạng thái còn ở "Chờ xác nhận" (PENDING). Sau khi tài xế đã xác nhận thì cần liên hệ nhà xe trực tiếp để huỷ.',
  },
  {
    category: 'FAQ',
    question: 'Ứng dụng hỗ trợ thanh toán những hình thức nào?',
    answer: 'LT-Move hỗ trợ: Tiền mặt khi lấy hàng, Chuyển khoản ngân hàng (VietQR), và ví điện tử MoMo.',
  },
  {
    category: 'FAQ',
    question: 'Tôi quên mật khẩu thì làm sao?',
    answer: 'Hiện tại vui lòng liên hệ hotline 1900-xxxx để được hỗ trợ đặt lại mật khẩu. Tính năng tự đặt lại mật khẩu qua SMS đang được phát triển.',
  },
  {
    category: 'FAQ',
    question: 'Mã giảm giá (voucher) dùng như thế nào?',
    answer: 'Khi xem lại đơn hàng ở bước "Xem trước đặt hàng", chọn "Dùng mã giảm giá" và nhập mã voucher. Giảm giá sẽ được áp dụng ngay vào tổng tiền. Mỗi đơn chỉ dùng được 1 mã.',
  },
  {
    category: 'FAQ',
    question: 'Voucher của tôi hết hạn khi nào? Xem ở đâu?',
    answer: 'Vào tab "Voucher của tôi" trong ứng dụng để xem toàn bộ mã đang có, ngày hết hạn, và điều kiện sử dụng của từng mã.',
  },
  {
    category: 'FAQ',
    question: 'Tại sao voucher của tôi không áp dụng được?',
    answer: 'Voucher có thể không dùng được do: đã hết hạn, đơn hàng chưa đạt giá trị tối thiểu, mã đã dùng rồi, hoặc không áp dụng cho tuyến này. Kiểm tra điều kiện của voucher trong tab "Voucher của tôi".',
  },
  {
    category: 'FAQ',
    question: 'Tôi có thể gửi nhiều kiện hàng trong một đơn không?',
    answer: 'Có. Bạn có thể ghi rõ số lượng kiện và tổng trọng lượng khi đặt đơn. Tuy nhiên tất cả các kiện phải cùng điểm giao và cùng người nhận.',
  },
  {
    category: 'FAQ',
    question: 'Làm sao để đánh giá tài xế sau khi nhận hàng?',
    answer: 'Sau khi đơn hàng chuyển sang trạng thái "Đã giao", ứng dụng sẽ hiện màn hình đánh giá. Bạn chấm sao và nhận xét về dịch vụ. Đánh giá giúp nâng cao chất lượng dịch vụ.',
  },
  {
    category: 'FAQ',
    question: 'Tôi có nhận được thông báo khi đơn hàng thay đổi trạng thái không?',
    answer: 'Có. Ứng dụng gửi thông báo đẩy (push notification) mỗi khi đơn của bạn có cập nhật: tài xế xác nhận, đang lấy hàng, đang trên đường, đã giao xong.',
  },
  {
    category: 'FAQ',
    question: 'Tôi đã đặt đơn nhưng tài xế chưa xác nhận, phải chờ bao lâu?',
    answer: 'Tài xế thường xác nhận trong vòng 1–2 giờ. Nếu sau 4 giờ vẫn chưa có phản hồi, bạn có thể huỷ đơn và đặt lại với chuyến xe khác, hoặc liên hệ hotline.',
  },
  {
    category: 'FAQ',
    question: 'Tôi có thể xem lịch sử đơn hàng cũ không?',
    answer: 'Có. Vào tab "Đơn hàng" và chọn bộ lọc để xem đơn đang xử lý hoặc đơn đã hoàn thành. Tất cả lịch sử đơn hàng được lưu trữ trong tài khoản của bạn.',
  },
  {
    category: 'FAQ',
    question: 'Thời gian giao hàng Hà Nội – Đà Nẵng mất bao lâu?',
    answer: 'Tuyến Hà Nội – Đà Nẵng mất khoảng 12–14 tiếng. Xe thường khởi hành buổi tối và đến Đà Nẵng vào sáng hôm sau.',
  },
  {
    category: 'FAQ',
    question: 'Thời gian giao hàng TP.HCM – Đà Nẵng mất bao lâu?',
    answer: 'Tuyến TP.HCM – Đà Nẵng mất khoảng 16–18 tiếng. Hàng thường đến trong ngày hôm sau kể từ khi gửi.',
  },
  {
    category: 'FAQ',
    question: 'Tôi có thể lưu địa chỉ thường dùng không?',
    answer: 'Có. Vào "Tài khoản" → "Địa chỉ đã lưu" để thêm và quản lý các địa chỉ lấy/giao hàng thường xuyên. Khi đặt đơn bạn chỉ cần chọn từ danh sách có sẵn.',
  },
  {
    category: 'FAQ',
    question: 'Tôi bị trừ tiền nhưng đơn hàng không thành công, lấy lại tiền như thế nào?',
    answer: 'Trường hợp này tiền sẽ được hoàn lại tự động trong 3–5 ngày làm việc về phương thức thanh toán ban đầu. Nếu quá 5 ngày chưa nhận, liên hệ hotline 1900-xxxx để được xử lý.',
  },
  // ── POLICY ───────────────────────────────────────────────────────────────
  {
    category: 'POLICY',
    question: 'Chính sách bồi thường hàng hỏng hoặc mất là gì?',
    answer: 'LT-Move bồi thường 100% giá trị hàng hoá (theo khai báo) nếu hàng mất do lỗi của nhà xe. Hàng hỏng được bồi thường tuỳ mức độ hư hại. Khách cần chụp ảnh hàng trước khi gửi để làm bằng chứng.',
  },
  {
    category: 'POLICY',
    question: 'Những loại hàng nào không được gửi?',
    answer: 'Các mặt hàng bị cấm: chất nổ, chất lỏng dễ cháy, vũ khí, ma tuý, hàng giả, thực phẩm không có bao bì, động vật sống. Vi phạm sẽ bị từ chối và có thể bị xử lý theo pháp luật.',
  },
  {
    category: 'POLICY',
    question: 'Hàng hoá có được bảo hiểm không?',
    answer: 'Bảo hiểm hàng hoá là tuỳ chọn khi đặt đơn. Phí bảo hiểm = 0.5% giá trị hàng khai báo. Khuyến nghị mua bảo hiểm cho hàng giá trị cao như điện tử, trang sức.',
  },
  {
    category: 'POLICY',
    question: 'Thời gian khiếu nại sau khi nhận hàng là bao lâu?',
    answer: 'Khách hàng có 24 giờ sau khi nhận hàng để khiếu nại về tình trạng hàng hoá. Sau 24 giờ LT-Move không chịu trách nhiệm về hư hỏng phát sinh.',
  },
  {
    category: 'POLICY',
    question: 'Chính sách hoàn tiền khi huỷ đơn là gì?',
    answer: 'Huỷ trước khi tài xế xác nhận: hoàn 100%. Huỷ sau khi tài xế xác nhận nhưng chưa lấy hàng: hoàn 80%. Huỷ sau khi tài xế đã lấy hàng: không hoàn tiền. Tiền hoàn về trong 3–5 ngày làm việc.',
  },
  {
    category: 'POLICY',
    question: 'Nếu hàng giao trễ so với dự kiến, tôi được bồi thường không?',
    answer: 'Giao trễ do thời tiết, thiên tai, kẹt xe: không bồi thường. Giao trễ do lỗi nhà xe (quên hàng, đi sai tuyến): được bồi thường phí vận chuyển và liên hệ hotline để xử lý cụ thể.',
  },
  {
    category: 'POLICY',
    question: 'Quy trình xử lý khiếu nại diễn ra như thế nào?',
    answer: 'Bước 1: Khách gửi khiếu nại qua ứng dụng kèm ảnh bằng chứng. Bước 2: AI sơ bộ phân tích và phân loại. Bước 3: Nhà xe xem xét và đưa ra phán quyết trong 48 giờ. Bước 4: Nếu không đồng ý, khách có thể liên hệ hotline để escalate.',
  },
  {
    category: 'POLICY',
    question: 'Hàng thực phẩm tươi và đông lạnh có được gửi không?',
    answer: 'Thực phẩm đã đóng gói kín, không cần bảo quản lạnh: được phép. Thực phẩm tươi sống, hải sản, đồ cần bảo quản lạnh: không nhận vì xe khách không có hệ thống làm lạnh. Liên hệ nhà xe chuyên lạnh nếu cần.',
  },
  {
    category: 'POLICY',
    question: 'Tôi khai báo sai trọng lượng thì sao?',
    answer: 'Nếu hàng thực tế nặng hơn khai báo, tài xế có thể cân lại và thu thêm phần chênh lệch. Cố tình gian lận trọng lượng nhiều lần có thể bị khoá tài khoản.',
  },
  // ── GUIDE ────────────────────────────────────────────────────────────────
  {
    category: 'GUIDE',
    question: 'Cách đóng gói hàng dễ vỡ đúng cách?',
    answer: 'Bọc hàng bằng bọc khí (bubble wrap) ít nhất 3 lớp. Dùng thùng carton cứng, chèn xốp hoặc giấy báo xung quanh. Dán nhãn "FRAGILE – DỄ VỠ" rõ ràng ở ngoài hộp.',
  },
  {
    category: 'GUIDE',
    question: 'Làm sao để đặt đơn gửi hàng?',
    answer: 'Bước 1: Chọn tuyến đường và nhà xe. Bước 2: Chọn chuyến xe phù hợp. Bước 3: Điền thông tin người gửi, người nhận và hàng hoá. Bước 4: Xem lại và xác nhận đơn. Bước 5: Thanh toán.',
  },
  {
    category: 'GUIDE',
    question: 'Tôi có thể yêu cầu lấy hàng tận nhà không?',
    answer: 'Có. Khi đặt đơn chọn dịch vụ "Lấy tận nơi" và điền địa chỉ lấy hàng. Phí lấy tận nơi tuỳ thuộc vào khoảng cách từ nhà đến bến xe, thường từ 15.000–50.000đ.',
  },
  {
    category: 'GUIDE',
    question: 'Người nhận có cần mang theo gì khi lấy hàng?',
    answer: 'Người nhận cần mang CMND/CCCD và cung cấp mã vận đơn. Nếu nhận hộ thì cần có giấy uỷ quyền của người nhận chính.',
  },
  {
    category: 'GUIDE',
    question: 'Hướng dẫn đóng gói hàng điện tử (điện thoại, laptop)?',
    answer: 'Dùng túi chống tĩnh điện bọc thiết bị. Đặt vào hộp xốp mềm hoặc thùng carton cứng có độ dày ít nhất 5mm. Chèn đủ xốp quanh 6 mặt để thiết bị không bị va đập. Ghi rõ "ĐIỆN TỬ – KHÔNG ĐẶT ĐỒ ĐÈ LÊN".',
  },
  {
    category: 'GUIDE',
    question: 'Hướng dẫn đóng gói quần áo, vải vóc?',
    answer: 'Gấp gọn quần áo vào túi zip hoặc túi nylon kín để tránh ẩm. Cho vào thùng carton hoặc túi dệt chắc chắn. Không cần bọc quá nhiều lớp nhưng cần buộc/dán miệng túi kín.',
  },
  {
    category: 'GUIDE',
    question: 'Cách gửi khiếu nại khi hàng bị hư hỏng?',
    answer: 'Bước 1: Chụp ảnh ngay lúc nhận hàng, trước khi mở kiện. Bước 2: Vào tab "Đơn hàng" → chọn đơn → "Khiếu nại". Bước 3: Chọn lý do, mô tả chi tiết và đính kèm ảnh. Bước 4: Gửi khiếu nại và theo dõi kết quả trong ứng dụng.',
  },
  {
    category: 'GUIDE',
    question: 'Cách cập nhật thông tin cá nhân trên ứng dụng?',
    answer: 'Vào tab "Tài khoản" → "Chỉnh sửa thông tin" để cập nhật họ tên, số điện thoại, ảnh đại diện. Lưu ý: email và số điện thoại đăng ký cần liên hệ hotline để thay đổi vì dùng để xác thực.',
  },
  {
    category: 'GUIDE',
    question: 'Làm sao để thêm và quản lý địa chỉ thường dùng?',
    answer: 'Vào "Tài khoản" → "Địa chỉ đã lưu" → nhấn dấu "+" để thêm địa chỉ mới. Nhập tên người nhận, số điện thoại, địa chỉ cụ thể. Khi đặt đơn lần sau chỉ cần chọn từ danh sách đã lưu.',
  },
  {
    category: 'GUIDE',
    question: 'Hướng dẫn sử dụng mã giảm giá khi đặt đơn?',
    answer: 'Khi ở bước "Xem trước đơn hàng", tìm ô "Mã giảm giá" và nhập code hoặc chọn từ danh sách voucher đang có. Mức giảm sẽ hiện ngay. Nhấn "Xác nhận đặt hàng" để áp dụng.',
  },
  {
    category: 'GUIDE',
    question: 'Làm sao để xem và theo dõi chuyến xe theo thời gian thực?',
    answer: 'Sau khi đơn được tài xế xác nhận và lên xe, bạn có thể vào chi tiết đơn hàng để xem trạng thái cập nhật theo từng mốc: Đang lấy hàng → Trên đường → Đã đến. Bật thông báo để nhận cập nhật tức thì.',
  },
];

async function main() {
  console.log('Seeding knowledge base...');

  await prisma.knowledgeBase.deleteMany();
  await prisma.knowledgeBase.createMany({ data: entries });

  console.log(`✓ Seeded ${entries.length} knowledge base entries`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
