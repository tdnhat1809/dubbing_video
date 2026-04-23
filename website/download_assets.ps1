# Create directories
$dirs = @(
    "public/images/particles",
    "public/images/hero",
    "public/images/flags",
    "public/images/steps",
    "public/images/features",
    "public/images/gallery",
    "public/images/testimonial",
    "public/images/icons",
    "public/images/blog",
    "public/videos"
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$base = "https://dichtudong.com/vi-vn"

# Download with error handling
function dl($url, $path) {
    try {
        Invoke-WebRequest -Uri $url -OutFile $path -ErrorAction Stop
        Write-Host "OK: $path"
    } catch {
        Write-Host "FAIL: $url"
    }
}

# Logo
dl "$base/assets/img/logo-1.png" "public/images/logo-1.png"
dl "$base/assets/img/preloader-logo.png" "public/images/preloader-logo.png"

# Particles
dl "$base/assets/img/particle/particle-1.png" "public/images/particles/particle-1.png"
dl "$base/assets/img/particle/particle-2.png" "public/images/particles/particle-2.png"
dl "$base/assets/img/particle/particle-3.png" "public/images/particles/particle-3.png"
dl "$base/assets/img/particle/particle-4.png" "public/images/particles/particle-4.png"
dl "$base/assets/img/particle/particle-5.png" "public/images/particles/particle-5.png"
dl "$base/assets/img/particle/title-line.png" "public/images/particles/title-line.png"
dl "$base/assets/img/particle/title-line-2.png" "public/images/particles/title-line-2.png"
dl "$base/assets/img/particle/heading-line.png" "public/images/particles/heading-line.png"
dl "$base/assets/img/particle/cta-left-particle-1.png" "public/images/particles/cta-left-particle-1.png"
dl "$base/assets/img/particle/cta-right-particle-1.png" "public/images/particles/cta-right-particle-1.png"

# Hero
dl "$base/assets/img/hero/app-dashboard.png" "public/images/hero/app-dashboard.png"
dl "$base/assets/img/hero/hero-1-overly.png" "public/images/hero/hero-1-overly.png"
dl "$base/assets/img/hero/hero-1-shadow.png" "public/images/hero/hero-1-shadow.png"
dl "$base/assets/img/hero/count-down-main-thumbnail.png" "public/images/hero/count-down-main-thumbnail.png"
dl "$base/assets/img/hero/count-down-main-thumbnail-border.png" "public/images/hero/count-down-main-thumbnail-border.png"
dl "$base/assets/img/hero/cover-2.png" "public/images/hero/cover-2.png"
dl "$base/assets/img/hero/3d_smartphone_with_5_stars_rating_concept_in_minimal_cartoon_style.jpg" "public/images/hero/3d-smartphone-rating.jpg"

# Flags
dl "$base/image/united-kingdom.png" "public/images/flags/united-kingdom.png"
dl "$base/image/vietnam.png" "public/images/flags/vietnam.png"
dl "$base/image/china.png" "public/images/flags/china.png"
dl "$base/image/south-korea.png" "public/images/flags/south-korea.png"

# Steps (how it works)
dl "https://cdn-site-assets.veed.io/Select_a_Video_File_fe95259209/Select_a_Video_File_fe95259209.png?width=640&quality=75" "public/images/steps/step-1.png"
dl "https://cdn-site-assets.veed.io/Manually_type_auto_transcribe_or_upload_subtitle_file_fa12432027/Manually_type_auto_transcribe_or_upload_subtitle_file_fa12432027.png?width=640&quality=75" "public/images/steps/step-2.png"
dl "https://cdn-site-assets.veed.io/Edit_and_Download_7808b216d9/Edit_and_Download_7808b216d9.png?width=640&quality=75" "public/images/steps/step-3.png"

# Features
dl "$base/image/3874137.png" "public/images/features/3874137.png"
dl "$base/image/10045767.png" "public/images/features/10045767.png"
dl "$base/image/9518869.png" "public/images/features/9518869.png"
dl "$base/image/6745483.png" "public/images/features/6745483.png"
dl "$base/image/4334816.png" "public/images/features/4334816.png"
dl "$base/image/2991494.png" "public/images/features/2991494.png"
dl "$base/image/2765167.png" "public/images/features/2765167.png"
dl "$base/image/text-recognising1.png" "public/images/features/text-recognising1.png"
dl "$base/image/text-to-speech1.png" "public/images/features/text-to-speech1.png"
dl "$base/image/smart.png" "public/images/features/smart.png"

# Gallery
dl "$base/assets/img/preview-gallery/core-statistic-1.jpg" "public/images/gallery/core-statistic-1.jpg"
dl "$base/assets/img/preview-gallery/core-statistic-2.jpg" "public/images/gallery/core-statistic-2.jpg"
dl "$base/assets/img/preview-gallery/core-statistic-3.jpg" "public/images/gallery/core-statistic-3.jpg"
dl "$base/assets/img/preview-gallery/core-statistic-4.jpg" "public/images/gallery/core-statistic-4.jpg"
dl "$base/assets/img/preview-gallery/preview-2-line.png" "public/images/gallery/preview-2-line.png"

# Fancy icons
dl "$base/assets/img/fancy-icon-box/01.png" "public/images/icons/01.png"
dl "$base/assets/img/fancy-icon-box/02.png" "public/images/icons/02.png"
dl "$base/assets/img/fancy-icon-box/03.png" "public/images/icons/03.png"
dl "$base/assets/img/fancy-icon-box/04.png" "public/images/icons/04.png"
dl "$base/assets/img/fancy-icon-box/05.png" "public/images/icons/05.png"
dl "$base/assets/img/fancy-icon-box/06.png" "public/images/icons/06.png"

# Testimonials
dl "$base/assets/img/testimonial/author-1.jpg" "public/images/testimonial/author-1.jpg"
dl "$base/assets/img/testimonial/author-2.jpg" "public/images/testimonial/author-2.jpg"
dl "$base/assets/img/testimonial/author-3.jpg" "public/images/testimonial/author-3.jpg"
dl "$base/assets/img/testimonial/author-4.jpg" "public/images/testimonial/author-4.jpg"

# Blog
dl "$base/image/blog_1.jpg" "public/images/blog/blog_1.jpg"
dl "$base/image/blog_1.webp" "public/images/blog/blog_1.webp"

# Background/section images
dl "$base/assets/img/footer-bg.png" "public/images/footer-bg.png"
dl "$base/assets/img/section-map.png" "public/images/section-map.png"

# Video
dl "$base/assets/img/demobackground.mp4" "public/videos/demobackground.mp4"

Write-Host "`nDone downloading all assets!"
