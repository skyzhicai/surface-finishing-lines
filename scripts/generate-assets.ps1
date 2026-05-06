$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AssetDir = Join-Path $Root "assets"
New-Item -ItemType Directory -Force -Path $AssetDir | Out-Null

function New-Brush($hex) {
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen($hex, $width = 1) {
    return [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
}

function Draw-Label($g, $text, $font, $brush, $x, $y, $w, $h) {
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new($x, $y, $w, $h)
    $g.DrawString($text, $font, $brush, $rect, $format)
    $format.Dispose()
}

function Draw-Arrow($g, $pen, $brush, $x1, $y1, $x2, $y2) {
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    $points = @(
        [System.Drawing.PointF]::new($x2, $y2),
        [System.Drawing.PointF]::new($x2 - 18, $y2 - 8),
        [System.Drawing.PointF]::new($x2 - 18, $y2 + 8)
    )
    $g.FillPolygon($brush, $points)
}

function Draw-Station($g, $x, $y, $w, $h, $fill, $accent, $label, $sub) {
    $bodyBrush = New-Brush $fill
    $topBrush = New-Brush "#f8fbfa"
    $accentBrush = New-Brush $accent
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#9aaba6"), 2)
    $labelBrush = New-Brush "#15211f"
    $mutedBrush = New-Brush "#5d6b67"
    $labelFont = [System.Drawing.Font]::new("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $subFont = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)

    $g.FillRectangle($bodyBrush, $x, $y, $w, $h)
    $g.DrawRectangle($borderPen, $x, $y, $w, $h)
    $g.FillRectangle($topBrush, $x + 10, $y + 10, $w - 20, 36)
    $g.FillRectangle($accentBrush, $x, $y, 12, $h)
    Draw-Label $g $label $labelFont $labelBrush ($x + 20) ($y + 52) ($w - 40) 38
    Draw-Label $g $sub $subFont $mutedBrush ($x + 20) ($y + 92) ($w - 40) 42

    $bodyBrush.Dispose()
    $topBrush.Dispose()
    $accentBrush.Dispose()
    $borderPen.Dispose()
    $labelBrush.Dispose()
    $mutedBrush.Dispose()
    $labelFont.Dispose()
    $subFont.Dispose()
}

function New-SurfaceLineVisual {
    param([string]$Path)

    $w = 1600
    $h = 1000
    $bmp = [System.Drawing.Bitmap]::new($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.Rectangle]::new(0, 0, $w, $h),
        [System.Drawing.ColorTranslator]::FromHtml("#f7faf9"),
        [System.Drawing.ColorTranslator]::FromHtml("#dde8e5"),
        90
    )
    $g.FillRectangle($bg, 0, 0, $w, $h)

    $gridPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#cbd8d4"), 1)
    for ($x = 0; $x -lt $w; $x += 80) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
    for ($y = 0; $y -lt $h; $y += 80) { $g.DrawLine($gridPen, 0, $y, $w, $y) }

    $titleBrush = New-Brush "#15211f"
    $mutedBrush = New-Brush "#50605c"
    $titleFont = [System.Drawing.Font]::new("Segoe UI", 40, [System.Drawing.FontStyle]::Bold)
    $smallFont = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
    $g.DrawString("Automated Surface Finishing Line", $titleFont, $titleBrush, 80, 68)
    $g.DrawString("Pre-treatment  |  Blasting  |  Washing  |  Drying  |  Inspection", $smallFont, $mutedBrush, 84, 128)

    $floorBrush = New-Brush "#d9e2df"
    $floorPoints = @(
        [System.Drawing.PointF]::new(70, 760),
        [System.Drawing.PointF]::new(1530, 760),
        [System.Drawing.PointF]::new(1420, 900),
        [System.Drawing.PointF]::new(180, 900)
    )
    $g.FillPolygon($floorBrush, $floorPoints)

    $beltBrush = New-Brush "#27302e"
    $beltLight = New-Brush "#7e908b"
    $beltPoints = @(
        [System.Drawing.PointF]::new(145, 650),
        [System.Drawing.PointF]::new(1460, 650),
        [System.Drawing.PointF]::new(1405, 720),
        [System.Drawing.PointF]::new(205, 720)
    )
    $g.FillPolygon($beltBrush, $beltPoints)
    for ($x = 210; $x -lt 1380; $x += 95) {
        $g.FillEllipse($beltLight, $x, 677, 38, 18)
    }

    Draw-Station $g 185 405 210 190 "#ffffff" "#f2b84b" "PRE-TREAT" "degrease + load ID"
    Draw-Station $g 430 330 255 265 "#ffffff" "#0f8a7a" "BLAST" "wheel media recovery"
    Draw-Station $g 725 402 210 193 "#ffffff" "#2f6f93" "SEPARATE" "screen + blow-off"
    Draw-Station $g 975 350 235 245 "#ffffff" "#0f8a7a" "WASH" "filtered spray stages"
    Draw-Station $g 1240 405 210 190 "#ffffff" "#c94f4f" "DRY + QC" "air knives + inspection"

    $arrowPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#0f8a7a"), 6)
    $arrowBrush = New-Brush "#0f8a7a"
    Draw-Arrow $g $arrowPen $arrowBrush 185 250 1420 250
    $g.DrawString("Part flow and control feedback", $smallFont, $mutedBrush, 610, 212)

    $partBrush = New-Brush "#b9c7c3"
    $partPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#667873"), 2)
    foreach ($p in @(@(275,635), @(560,634), @(835,635), @(1090,635), @(1330,636))) {
        $g.FillEllipse($partBrush, $p[0], $p[1], 72, 28)
        $g.DrawEllipse($partPen, $p[0], $p[1], 72, 28)
    }

    $dataBrush = New-Brush "#ffffff"
    $dataPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#9aaba6"), 2)
    $g.FillRectangle($dataBrush, 1080, 82, 380, 120)
    $g.DrawRectangle($dataPen, 1080, 82, 380, 120)
    $hmiFont = [System.Drawing.Font]::new("Segoe UI", 19, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("PLC / HMI", $hmiFont, $titleBrush, 1110, 104)
    $g.DrawString("recipes, alarms, OEE, roughness data", $smallFont, $mutedBrush, 1112, 145)

    $bg.Dispose()
    $gridPen.Dispose()
    $titleBrush.Dispose()
    $mutedBrush.Dispose()
    $titleFont.Dispose()
    $smallFont.Dispose()
    $floorBrush.Dispose()
    $beltBrush.Dispose()
    $beltLight.Dispose()
    $arrowPen.Dispose()
    $arrowBrush.Dispose()
    $partBrush.Dispose()
    $partPen.Dispose()
    $dataBrush.Dispose()
    $dataPen.Dispose()
    $hmiFont.Dispose()
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-ControlVisual {
    param([string]$Path)

    $w = 1400
    $h = 900
    $bmp = [System.Drawing.Bitmap]::new($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml("#f4f7f6"))

    $linePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#cbd8d4"), 2)
    $accentPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#0f8a7a"), 5)
    $titleBrush = New-Brush "#15211f"
    $mutedBrush = New-Brush "#5d6b67"
    $tealBrush = New-Brush "#0f8a7a"
    $yellowBrush = New-Brush "#f2b84b"
    $blueBrush = New-Brush "#2f6f93"
    $whiteBrush = New-Brush "#ffffff"
    $fontTitle = [System.Drawing.Font]::new("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
    $fontNode = [System.Drawing.Font]::new("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $fontSmall = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)

    $g.DrawString("Finishing Line Automation Stack", $fontTitle, $titleBrush, 70, 58)
    $g.DrawString("Recipe control, sensors and production data for repeatable surface quality", $fontSmall, $mutedBrush, 74, 112)

    $nodes = @(
        @{x=105; y=210; w=270; h=120; color=$yellowBrush; label="ERP / MES"; sub="orders + lot traceability"},
        @{x=565; y=210; w=270; h=120; color=$blueBrush; label="SCADA"; sub="dashboards + reports"},
        @{x=1025; y=210; w=270; h=120; color=$tealBrush; label="Quality"; sub="Ra, Rz + SPC records"},
        @{x=425; y=430; w=550; h=130; color=$tealBrush; label="Main PLC"; sub="sequencing, safety interlocks, recipes, alarms"},
        @{x=92; y=690; w=205; h=105; color=$blueBrush; label="Blast"; sub="wheel current + media flow"},
        @{x=340; y=690; w=205; h=105; color=$yellowBrush; label="Wash"; sub="pressure + pH + temp"},
        @{x=588; y=690; w=205; h=105; color=$tealBrush; label="Dry"; sub="airflow + dwell time"},
        @{x=836; y=690; w=205; h=105; color=$blueBrush; label="Convey"; sub="speed + jam detection"},
        @{x=1084; y=690; w=205; h=105; color=$yellowBrush; label="Inspect"; sub="vision + sampling"}
    )

    foreach ($n in $nodes) {
        $g.FillRectangle($whiteBrush, $n.x, $n.y, $n.w, $n.h)
        $g.DrawRectangle($linePen, $n.x, $n.y, $n.w, $n.h)
        $g.FillRectangle($n.color, $n.x, $n.y, 12, $n.h)
        Draw-Label $g $n.label $fontNode $titleBrush ($n.x + 18) ($n.y + 22) ($n.w - 36) 32
        Draw-Label $g $n.sub $fontSmall $mutedBrush ($n.x + 18) ($n.y + 60) ($n.w - 36) 36
    }

    $g.DrawLine($accentPen, 240, 330, 610, 430)
    $g.DrawLine($accentPen, 700, 330, 700, 430)
    $g.DrawLine($accentPen, 1160, 330, 790, 430)
    foreach ($x in @(195,443,691,939,1187)) {
        $g.DrawLine($accentPen, 700, 560, $x, 690)
    }

    $linePen.Dispose()
    $accentPen.Dispose()
    $titleBrush.Dispose()
    $mutedBrush.Dispose()
    $tealBrush.Dispose()
    $yellowBrush.Dispose()
    $blueBrush.Dispose()
    $whiteBrush.Dispose()
    $fontTitle.Dispose()
    $fontNode.Dispose()
    $fontSmall.Dispose()
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

New-SurfaceLineVisual -Path (Join-Path $AssetDir "surface-line-visual.png")
New-ControlVisual -Path (Join-Path $AssetDir "process-control-visual.png")

Write-Host "Generated visual assets in $AssetDir"
