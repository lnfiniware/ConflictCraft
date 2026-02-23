Add-Type -AssemblyName System.Drawing

$size = 128
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$red = [System.Drawing.ColorTranslator]::FromHtml('#c1121f')
$black = [System.Drawing.ColorTranslator]::FromHtml('#161a22')
$white = [System.Drawing.Color]::White

# Rounded outer square
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$x = 8; $y = 8; $w = 112; $h = 112; $r = 22
$path.AddArc($x, $y, $r, $r, 180, 90)
$path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
$path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
$path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
$path.CloseFigure()

$pen = New-Object System.Drawing.Pen($red, 5)
$brushWhite = New-Object System.Drawing.SolidBrush($white)
$g.FillPath($brushWhite, $path)
$g.DrawPath($pen, $path)

$brushBlack = New-Object System.Drawing.SolidBrush($black)
$brushRed = New-Object System.Drawing.SolidBrush($red)

# C glyph
$g.FillRectangle($brushBlack, 43, 35, 37, 10)
$g.FillRectangle($brushBlack, 43, 35, 12, 52)
$g.FillRectangle($brushBlack, 43, 77, 37, 10)

# Red dot
$g.FillEllipse($brushRed, 78, 78, 12, 12)

$outPath = Join-Path (Get-Location) 'vscode-extension/assets/conflictcraft-logo.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$pen.Dispose()
$brushWhite.Dispose()
$brushBlack.Dispose()
$brushRed.Dispose()
$path.Dispose()
$g.Dispose()
$bmp.Dispose()
