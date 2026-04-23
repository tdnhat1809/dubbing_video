# 🎨 Log UI Design - DichTuDong Clone

## Stitch Design System
- **Project ID**: `12675836425678618982`
- **Design System**: "Lumina Gloss"
- **Asset ID**: `16e41b343cdf4173a8aac8a609a14c73`

### Color Palette
| Token | Hex | Mô tả |
|-------|-----|-------|
| Primary | `#4a4ae1` | Indigo chính |
| Primary Dim | `#3735d0` | Hover state |
| Primary Container | `#9496ff` | Gradient end |
| Secondary | `#575493` | Text links |
| Accent Coral | `#e84393` | CTA buttons |
| Accent Orange | `#ff8c42` | Badges |
| Surface | `#faf4ff` | Background chính |
| Surface Container | `#ece4ff` | Alt background |
| On Surface | `#302950` | Text chính |

### Typography
- **Font Family**: Be Vietnam Pro
- **Weights**: 300, 400, 500, 600, 700, 800
- **Display**: 3.5rem / 2.75rem
- **Headline**: 2rem / 1.75rem
- **Body**: 1.0625rem / 0.9375rem
- **Label**: 0.875rem / 0.8125rem

### Design Decisions (2026-04-06)
1. Dùng CSS Variables thay vì hardcoded values
2. Glassmorphism cho Header (backdrop-filter: blur(20px))
3. Gradient buttons (primary → primary-container)
4. Tinted shadows (rgba(48,41,80,x)) thay vì black
5. CSS Modules cho component isolation
6. No Tailwind - giữ vanilla CSS cho flexibility

## Generated Stitch Screens
| Screen | ID | Resolution |
|--------|-----|-----------|
| Homepage | `72685e1631ed4708a173f91e62966de8` | 2560x7072 |
| Pricing | `bf1b4beb7fb641d49cc6ac8c04548cee` | 2560x5774 |
| Login | `46a6feaa03fd4a599a09624ba677a948` | 2560x2048 |
| Contact | `8d764fbb2d214dd1a33380d2ed7eb7c2` | 2560x4232 |
