# Copy final_*.wav from test_voices_valtec to models/valtec/previews
# with filenames matching the API naming convention

$srcDir = "C:\python\ommivoice\test_voices_valtec"
$dstDir = "C:\python\ommivoice\models\valtec\previews"

# Clear old previews
Remove-Item "$dstDir\*.wav" -Force -ErrorAction SilentlyContinue

# Mapping: voice .pt filename -> final wav filename
$mapping = @{
    "Vietnam_hoa-mai (woman).pt"         = "final_hoa-mai (woman).wav"
    "Vietnam_my-huyen (woman).pt"        = "final_my-huyen (woman).wav"
    "Vietnam_ngoc-anh (woman).pt"        = "final_ngoc-anh (woman).wav"
    "Vietnam_ngoc-duyen (woman).pt"      = "final_ngoc-duyen (woman).wav"
    "Vietnam_quynh-nhu (woman).pt"       = "final_quynh-nhu (woman).wav"
    "Vietnam_thao-van (woman).pt"        = "final_thao-van (woman).wav"
    "Vietnam_thuy-linh (woman).pt"       = "final_thuy-linh (woman).wav"
    "Vietnam_ha-giang (woman).pt"        = "final_ha-giang (woman).wav"
    "Vietnam_lan-my (woman).pt"          = "final_lan-my (woman).wav"
    "Vietnam_minh-thu (woman).pt"        = "final_minh-thu (woman).wav"
    "Vietnam_hoang-son (man).pt"         = "final_hoang-son (man).wav"
    "Vietnam_le-nam (man).pt"            = "final_le-nam (man).wav"
    "Vietnam_nguyen-thang (man).pt"      = "final_nguyen-thang (man).wav"
    "Vietnam_nguyen-tung (man).pt"       = "final_nguyen-tung (man).wav"
    "Vietnam_tran-binh (man).pt"         = "final_tran-binh (man).wav"
    "Vietnam_trung-anh (man).pt"         = "final_trung-anh (man).wav"
    "Vietnam_tung-lam (man).pt"          = "final_tung-lam (man).wav"
    "Vietnam_dinh-quan (man).pt"         = "final_dinh-quan (man).wav"
    "Vietnam_minh-tuan (man).pt"         = "final_minh-tuan (man).wav"
    "Vietnam_the-trung (man).pt"         = "final_the-trung (man).wav"
    "Vietnam_binh-an (child).pt"         = "final_binh-an (child).wav"
    "Vietnam_nguyen-lien (old woman).pt" = "final_nguyen-lien (old woman).wav"
    "Vietnam_tung-lam (old man).pt"      = "final_tung-lam (old man).wav"
    "Vietnam_quang-linh (gay).pt"        = "final_quang-linh (gay).wav"
    "Vietnam_suca.pt"                    = "final_suca.wav"
}

$count = 0
foreach ($entry in $mapping.GetEnumerator()) {
    $voiceFile = $entry.Key
    $srcFile = $entry.Value
    
    # API uses: voice.replace(/\s/g, '_').replace(/[()]/g, '') + ".wav"
    $safeName = $voiceFile -replace '\s', '_' -replace '[()]', ''
    $dstFile = "$dstDir\$safeName.wav"
    $srcPath = "$srcDir\$srcFile"
    
    if (Test-Path $srcPath) {
        Copy-Item $srcPath $dstFile -Force
        $size = [math]::Round((Get-Item $dstFile).Length / 1024)
        Write-Host "  OK: $voiceFile -> $safeName.wav (${size}KB)"
        $count++
    } else {
        Write-Host "  MISSING: $srcPath"
    }
}

Write-Host "`nCopied $count/25 preview files to $dstDir"
