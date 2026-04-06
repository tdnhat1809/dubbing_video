export default function DieuKhoanPage() {
  return (
    <>
      <header className="relative overflow-hidden pt-20 pb-16 px-6">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-container blur-[60px] opacity-40 -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex justify-center items-center gap-2 mb-6 text-sm font-medium text-on-surface-variant/70">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Thư Viện</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-semibold">Điều Khoản Sử Dụng</span>
          </nav>
          <h1 className="text-5xl md:text-6xl italic font-light tracking-tight text-on-background mb-8">Điều Khoản Sử Dụng</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 pb-20">
        <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-12 shadow-sm space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">1. Giới thiệu</h2>
            <p className="text-on-surface-variant leading-relaxed">Chào mừng bạn đến với DichTuDong.com. Bằng việc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này. Vui lòng đọc kỹ trước khi sử dụng nền tảng.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">2. Quyền sở hữu trí tuệ</h2>
            <p className="text-on-surface-variant leading-relaxed">Bạn giữ toàn bộ quyền sở hữu đối với nội dung gốc mà bạn tải lên. DichTuDong.com không lưu trữ video sau khi xử lý hoàn tất. Bản quyền video dịch thuộc về chủ sở hữu video gốc.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">3. Sử dụng dịch vụ</h2>
            <p className="text-on-surface-variant leading-relaxed">Người dùng cam kết không sử dụng dịch vụ cho mục đích bất hợp pháp, vi phạm bản quyền, hoặc phát tán nội dung có hại. Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản vi phạm.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">4. Chính sách bảo mật</h2>
            <p className="text-on-surface-variant leading-relaxed">Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Dữ liệu video được mã hóa trong quá trình truyền tải và xử lý. Xem thêm tại trang Chính sách bảo mật.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">5. Giới hạn trách nhiệm</h2>
            <p className="text-on-surface-variant leading-relaxed">DichTuDong.com cung cấp dịch vụ dịch thuật tự động bằng AI. Mặc dù đạt độ chính xác lên đến 97,8%, chúng tôi không đảm bảo kết quả hoàn hảo 100% và khuyến khích người dùng kiểm tra bản dịch trước khi sử dụng chính thức.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">6. Liên hệ</h2>
            <p className="text-on-surface-variant leading-relaxed">Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ qua email: <span className="text-primary font-semibold">support@dichtudong.com</span> hoặc hotline: <span className="text-primary font-semibold">1900-xxxx</span>.</p>
          </section>
        </div>
      </main>
    </>
  );
}
