# Generates the 16x16 block textures and the 128x128 mod icon for CrabSense RAS.
# Pure System.Drawing so it runs on any Windows box without Python/PIL.
# Brand palette (from CrabSense): lime #6DC22E, forest #0A3323.
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$assets = Join-Path (Split-Path $PSScriptRoot -Parent) 'src\main\resources\assets\crabsense_ras'
$texDir = Join-Path $assets 'textures\block'
New-Item -ItemType Directory -Force $texDir | Out-Null

function New-Bmp([int]$size = 16) { New-Object System.Drawing.Bitmap $size, $size }

function Fill([System.Drawing.Bitmap]$b, [string]$hex) {
	$c = [System.Drawing.ColorTranslator]::FromHtml($hex)
	for ($y = 0; $y -lt $b.Height; $y++) { for ($x = 0; $x -lt $b.Width; $x++) { $b.SetPixel($x, $y, $c) } }
}

function Rect([System.Drawing.Bitmap]$b, [int]$x0, [int]$y0, [int]$x1, [int]$y1, [string]$hex) {
	$c = [System.Drawing.ColorTranslator]::FromHtml($hex)
	for ($y = $y0; $y -le $y1; $y++) { for ($x = $x0; $x -le $x1; $x++) { $b.SetPixel($x, $y, $c) } }
}

function Save-Tex([System.Drawing.Bitmap]$b, [string]$name) {
	$b.Save((Join-Path $texDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
	$b.Dispose()
	Write-Output "  textures/block/$name"
}

# --- tank: a water tank cutaway ---
$b = New-Bmp
Fill $b '#0E4460'
Rect $b 1 1 14 14 '#3FA9DE'
Rect $b 1 1 14 2  '#BFE9FF'   # surface
Rect $b 1 11 14 11 '#2C86B5'  # shade
Rect $b 1 12 14 14 '#1E6E96'
Save-Tex $b 'tank.png'

# --- pump: metal casing with a lime impeller ---
$b = New-Bmp
Fill $b '#8A9099'
Rect $b 0 0 15 1 '#B7BDC4'     # top bevel
Rect $b 0 14 15 15 '#5E646B'   # bottom shade
Rect $b 0 0 1 15 '#9BA1AA'     # left bevel
Rect $b 14 0 15 15 '#6E747C'   # right shade
Rect $b 5 5 10 10 '#6DC22E'    # impeller boss
Rect $b 7 4 8 12 '#6E747C'
Rect $b 4 7 12 8 '#6E747C'
Save-Tex $b 'pump.png'

# --- rack: rearing rack frame (posts + shelves), blue steel ---
$b = New-Bmp
Fill $b '#33577F'
Rect $b 0 0 15 1 '#4E7CB8'     # top bevel
Rect $b 0 14 15 15 '#223A57'   # bottom shade
Rect $b 0 0 1 15 '#3F6795'
Rect $b 14 0 15 15 '#2A4869'
Rect $b 7 2 8 13 '#2A4869'     # panel seam
Save-Tex $b 'rack.png'

# --- crab_box: blue RAS crab box (plastic body + mesh grid) ---
$b = New-Bmp
Fill $b '#3A6FB0'
Rect $b 0 0 15 0 '#5B93D6'      # top rim highlight
Rect $b 0 15 15 15 '#27497A'    # bottom shade
Rect $b 1 1 1 14 '#4E86C9'      # left edge highlight
Rect $b 14 1 14 14 '#4E86C9'    # right edge highlight
foreach ($p in 4, 8, 12) { Rect $b $p 1 $p 14 '#27497A'; Rect $b 1 $p 14 $p '#27497A' }  # mesh
Save-Tex $b 'crab_box.png'

# --- drum_filter: red drum with metal bands ---
$b = New-Bmp
Fill $b '#2E3338'
Rect $b 1 1 14 14 '#8A9299'
Rect $b 1 1 14 3 '#B4443F'    # drum band
Rect $b 1 12 14 14 '#B4443F'  # drum band
Rect $b 4 4 11 11 '#5F686F'   # drum face recess
Rect $b 6 6 9 9 '#2E3338'     # hub
Save-Tex $b 'drum_filter.png'

# --- mod icon 128x128 ---
$icon = New-Object System.Drawing.Bitmap 128, 128
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A3323'))
$lime = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#6DC22E'))
$water = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#3FA9DE'))
$g.FillRectangle($lime, 0, 0, 128, 12)
$g.FillRectangle($lime, 0, 116, 128, 12)
$g.FillRectangle($lime, 0, 0, 12, 128)
$g.FillRectangle($lime, 116, 0, 12, 128)
$g.FillRectangle($water, 22, 34, 84, 60)
$g.FillRectangle($lime, 22, 34, 84, 10)
$g.Dispose()
$icon.Save((Join-Path $assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()
Write-Output "  icon.png"
Write-Output "done."
