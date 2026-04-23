import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-12 px-8 bg-slate-50 dark:bg-slate-900 border-t border-outline-variant/10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
        <div className="col-span-1 md:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">movie_filter</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">B2Vision.com</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Nền tảng dịch video bằng AI hàng đầu, giúp phá bỏ mọi rào cản ngôn ngữ trong truyền thông và giáo dục.
          </p>
        </div>
        <div className="space-y-4">
          <h5 className="font-bold text-sm text-slate-800">Dịch vụ</h5>
          <ul className="space-y-2">
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Dịch Subtitle</Link></li>
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Lồng tiếng AI</Link></li>
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">OCR Video</Link></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h5 className="font-bold text-sm text-slate-800">Hỗ trợ</h5>
          <ul className="space-y-2">
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Trung tâm hỗ trợ</Link></li>
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Hướng dẫn sử dụng</Link></li>
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="/lien-he">Liên hệ</Link></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h5 className="font-bold text-sm text-slate-800">Pháp lý</h5>
          <ul className="space-y-2">
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Điều khoản dịch vụ</Link></li>
            <li><Link className="text-slate-500 hover:text-indigo-500 underline underline-offset-4 text-xs font-normal" href="#">Chính sách bảo mật</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs font-normal text-slate-500">© 2024 B2Vision.com. All rights reserved.</p>
        <div className="flex gap-6">
          <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">social_leaderboard</span></a>
          <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">smart_display</span></a>
          <a className="text-slate-400 hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">campaign</span></a>
        </div>
      </div>
    </footer>
  );
}
