# Generuje ikony PWA (PNG) – wieszak na fioletowym gradiencie. Uruchom: powershell -File scripts/generate-icons.ps1
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-Icon([int]$size, [string]$file, [double]$glyphScale) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $c1 = [System.Drawing.Color]::FromArgb(139, 92, 246)
  $c2 = [System.Drawing.Color]::FromArgb(30, 27, 75)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
  $g.FillRectangle($brush, $rect)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [single]($size * 0.045 * $glyphScale))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $cx = $size / 2.0
  $u = $size * $glyphScale / 64.0          # jednostka siatki 64x64
  $ox = $cx - 32 * $u
  $oy = ($size - 64 * $u) / 2.0

  function P([double]$x, [double]$y) { New-Object System.Drawing.PointF([single]($ox + $x * $u), [single]($oy + $y * $u)) }

  # haczyk
  $g.DrawArc($pen, [single]($ox + 27 * $u), [single]($oy + 9 * $u), [single](10 * $u), [single](10 * $u), -90, 270)
  $g.DrawLine($pen, (P 32 19), (P 32 28))
  # ramiona wieszaka
  $pts = @((P 32 28), (P 8 46), (P 8 50), (P 56 50), (P 56 46), (P 32 28))
  $g.DrawLines($pen, $pts)

  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $pen.Dispose()
}

New-Icon 192 'icon-192.png' 0.78
New-Icon 512 'icon-512.png' 0.78
New-Icon 512 'icon-maskable-512.png' 0.55   # większy margines (safe zone)
New-Icon 180 'apple-touch-icon.png' 0.78
New-Icon 167 'apple-touch-icon-167.png' 0.78
New-Icon 152 'apple-touch-icon-152.png' 0.78
Write-Host 'Gotowe:' $out
