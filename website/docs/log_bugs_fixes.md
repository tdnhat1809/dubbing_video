# 🐛 Log Bugs & Fixes - DichTuDong Clone

## Bug #1: Footer onSubmit Error
- **Date**: 2026-04-06
- **Error**: `Event handlers cannot be passed to Client Component props`
- **Cause**: `Footer.js` sử dụng `onSubmit` handler nhưng không có `'use client'` directive
- **Fix**: Thêm `'use client';` vào đầu `Footer.js`
- **File**: `app/components/Footer.js:1`
- **Status**: ✅ Fixed
