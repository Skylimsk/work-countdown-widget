Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\skyli\.gemini\antigravity\brain\a7efbe6b-065b-4503-921d-66dfe07aacb8\.user_uploaded\media__1785313673078.jpg"
$destPath = Join-Path $PSScriptRoot "icon.png"

$src = [System.Drawing.Image]::FromFile($srcPath)
$dest = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, 256, 256)
$src.Dispose()
$dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()
