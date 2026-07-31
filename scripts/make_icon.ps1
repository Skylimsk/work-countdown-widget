Add-Type -AssemblyName System.Drawing
$size = 256
$b = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
$c2 = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
$cyan = [System.Drawing.Color]::FromArgb(255, 56, 189, 248)
$indigo = [System.Drawing.Color]::FromArgb(255, 99, 102, 241)

$g.Clear([System.Drawing.Color]::Transparent)

# Background pill path
$rect = New-Object System.Drawing.Rectangle(12, 12, 232, 232)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse($rect)

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c2, $c1, 45)
$g.FillPath($brush, $path)

# Glowing Ring
$pen = New-Object System.Drawing.Pen($cyan, 8)
$g.DrawEllipse($pen, 32, 32, 192, 192)

# Clock Dial Lines
$dialPen = New-Object System.Drawing.Pen($indigo, 6)
$g.DrawEllipse($dialPen, 64, 64, 128, 128)

# Hands
$hPen = New-Object System.Drawing.Pen($cyan, 10)
$g.DrawLine($hPen, 128, 128, 128, 80)

$mPen = New-Object System.Drawing.Pen($indigo, 8)
$g.DrawLine($mPen, 128, 128, 168, 128)

# Center Dot
$g.FillEllipse([System.Drawing.Brushes]::White, 120, 120, 16, 16)

$b.Save((Join-Path $PSScriptRoot 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
