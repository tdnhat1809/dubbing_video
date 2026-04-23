# Download Thu Vien page assets
$base = "https://dichtudong.com/vi-vn"

New-Item -ItemType Directory -Force -Path "public/images/library" | Out-Null
New-Item -ItemType Directory -Force -Path "public/images/brands" | Out-Null
New-Item -ItemType Directory -Force -Path "public/images/faq" | Out-Null

function dl($url, $path) {
    try {
        Invoke-WebRequest -Uri $url -OutFile $path -ErrorAction Stop
        Write-Host "OK: $path"
    } catch {
        Write-Host "FAIL: $url"
    }
}

# Library thumbnails
dl "$base/image/chat-gpt-2.jpg" "public/images/library/chat-gpt-2.jpg"
dl "$base/image/hoat-hinh-01.jpg" "public/images/library/hoat-hinh-01.jpg"
dl "$base/image/thanh-xuan.jpg" "public/images/library/thanh-xuan.jpg"
dl "$base/image/ceo-tiktok-1.jpg" "public/images/library/ceo-tiktok-1.jpg"
dl "$base/image/sean-1.jpg" "public/images/library/sean-1.jpg"
dl "$base/image/huu-minh.jpg" "public/images/library/huu-minh.jpg"
dl "$base/image/ai-02.jpg" "public/images/library/ai-02.jpg"
dl "$base/image/ted-01.jpg" "public/images/library/ted-01.jpg"
dl "$base/image/ted-02.jpg" "public/images/library/ted-02.jpg"
dl "$base/image/ted-03.jpg" "public/images/library/ted-03.jpg"

# Brands
dl "$base/assets/img/brands/brand-1.png" "public/images/brands/brand-1.png"
dl "$base/assets/img/brands/brand-2.png" "public/images/brands/brand-2.png"
dl "$base/assets/img/brands/brand-3.png" "public/images/brands/brand-3.png"
dl "$base/assets/img/brands/brand-4.png" "public/images/brands/brand-4.png"
dl "$base/assets/img/brands/brand-5.png" "public/images/brands/brand-5.png"

# FAQ
dl "$base/assets/img/faq/faq.avif" "public/images/faq/faq.avif"

# Newsletter bg
dl "$base/assets/img/particle/newsletter-bg.png" "public/images/particles/newsletter-bg.png"

Write-Host "`nDone downloading Thu Vien assets!"
