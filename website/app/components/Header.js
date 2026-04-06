'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-xl shadow-indigo-900/5 dark:shadow-none">
      <nav className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>movie_filter</span>
          <span className="text-2xl font-black tracking-tighter text-indigo-700 dark:text-indigo-300">DichTuDong.com</span>
        </Link>
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-tight">
          <Link className={isActive('/') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all'} href="/">Trang chủ</Link>
          <Link className={isActive('/dich-vu') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all'} href="/dich-vu">Dịch Vụ</Link>
          <Link className={isActive('/gia-ca') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all'} href="/gia-ca">Giá Cả</Link>
          <div className="group relative">
            <button className={`flex items-center gap-1 transition-all ${pathname.startsWith('/thu-vien') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}>
              Thư Viện <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="bg-surface-container-lowest rounded-xl shadow-2xl py-2 min-w-[220px] border border-outline-variant/10">
                <Link href="/thu-vien" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">Thư Viện</Link>
                <Link href="/thu-vien/tai-lieu" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">Tài Liệu</Link>
                <Link href="/thu-vien/demo" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">DEMO</Link>
                <Link href="/thu-vien/dieu-khoan" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">Điều Khoản Sử Dụng</Link>
              </div>
            </div>
          </div>
          <Link className={isActive('/lien-he') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all'} href="/lien-he">Liên Hệ</Link>
          <div className="group relative">
            <button className={`flex items-center gap-1 transition-all ${pathname.startsWith('/huong-dan') ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500 pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}>
              Hướng Dẫn <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="bg-surface-container-lowest rounded-xl shadow-2xl py-2 min-w-[220px] border border-outline-variant/10">
                <Link href="/huong-dan" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">Hướng Dẫn</Link>
                <Link href="/huong-dan/dich-tu-dong" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">HD Dịch Tự Động</Link>
                <Link href="/huong-dan/chinh-sua-noi-dung" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">HD Chỉnh Sửa Nội Dung</Link>
                <Link href="/huong-dan/su-dung-bo-loc" className="block px-5 py-3 text-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors">HD Sử Dụng Bộ Lọc</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-600 hover:bg-indigo-50/50 rounded-full transition-all">
            <span className="material-symbols-outlined">search</span>
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant/20 text-xs font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">language</span>
            Tiếng Việt
          </div>
          <Link href="/dang-nhap" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:scale-95 duration-200 ease-in-out shadow-lg shadow-primary/20">
            Đăng Ký
          </Link>
        </div>
      </nav>
    </header>
  );
}
