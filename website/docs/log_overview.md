# 📋 Log Tổng Quan Project - DichTuDong Clone

## Thông tin Project
| Mục | Chi tiết |
|-----|----------|
| **Tên** | DichTuDong.com Clone |
| **Mục tiêu** | Clone website dichtudong.com - nền tảng dịch video AI |
| **Ngày bắt đầu** | 06/04/2026 |
| **Tech Stack** | Next.js 16 + Vanilla CSS + PostgreSQL |
| **Deploy** | DigitalOcean VPS |
| **Stitch Project ID** | `12675836425678618982` |

## Timeline

### 2026-04-06 - Khởi tạo project
- ✅ Nghiên cứu website gốc dichtudong.com (6 trang)
- ✅ Tạo Stitch project "DichTuDong Clone" - Generate 4 screens (Homepage, Pricing, Login, Contact)
- ✅ Stitch Design System: "Lumina Gloss" - Primary #4a4ae1, Font: Be Vietnam Pro
- ✅ Tạo Next.js 16 project (`c:\python\ommivoice\website`)
- ✅ Build Design System CSS (globals.css) - 300+ lines
- ✅ Build shared components: Header (sticky nav, dropdowns, mobile menu), Footer (newsletter, links)
- ✅ Build 5 trang frontend:
  - `/` - Trang chủ (hero, OCR features, AI features, 3 steps, use cases, testimonials, stats)
  - `/gia-ca` - Giá Cả (3 pricing tiers, stats bar, FAQ accordion)
  - `/dich-vu` - Dịch Vụ (6 service cards, comparison table, CTA)
  - `/dang-nhap` - Đăng Nhập (split layout, Google OAuth UI, email form)
  - `/lien-he` - Liên Hệ (info cards, social links, contact form)
- ✅ Fix bug: Footer cần `'use client'` directive (onSubmit handler)
- ✅ Verify: All 5 pages render correctly

## Tech Stack
| Layer | Công nghệ |
|-------|-----------|
| Frontend Framework | Next.js 16.2.2 (App Router) |
| CSS | Vanilla CSS (CSS Modules + Global CSS) |
| Font | Be Vietnam Pro (Google Fonts) |
| Design System Ref | Stitch "Lumina Gloss" |
| Colors | Primary #4a4ae1, Coral #e84393, Orange #ff8c42 |
| Backend (planned) | Next.js API Routes + Python subprocess |
| Database (planned) | PostgreSQL |
| Auth (planned) | NextAuth.js + Google OAuth |
| Deploy (planned) | DigitalOcean VPS |

## Cấu trúc thư mục
```
website/
├── app/
│   ├── globals.css        # Design system CSS
│   ├── layout.js          # Root layout (Header + Footer)
│   ├── page.js            # Trang chủ
│   ├── page.module.css
│   ├── components/
│   │   ├── Header.js
│   │   ├── Header.module.css
│   │   ├── Footer.js
│   │   └── Footer.module.css
│   ├── gia-ca/
│   │   ├── page.js
│   │   └── page.module.css
│   ├── dich-vu/
│   │   ├── page.js
│   │   └── page.module.css
│   ├── dang-nhap/
│   │   ├── page.js
│   │   └── page.module.css
│   └── lien-he/
│       ├── page.js
│       └── page.module.css
├── public/
├── package.json
└── next.config.mjs
```
