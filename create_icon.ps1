$width = 16
$height = 16
$bpp = 32
$imageSize = $width * $height * 4 + 40
$offset = 22

$header = [byte[]]@(0,0,1,0,1,0)
$entry = [byte[]]@(
    $width, $height, 0, 0,
    1,0,
    ($bpp -band 0xFF), (($bpp -shr 8) -band 0xFF),
    ($imageSize -band 0xFF), (($imageSize -shr 8) -band 0xFF), (($imageSize -shr 16) -band 0xFF), (($imageSize -shr 24) -band 0xFF),
    ($offset -band 0xFF), (($offset -shr 8) -band 0xFF), (($offset -shr 16) -band 0xFF), (($offset -shr 24) -band 0xFF)
)

$bih = [byte[]]@(
    40,0,0,0,
    $width,0,0,0,
    ($height*2),0,0,0,
    1,0,
    $bpp,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0
)

$pixels = @()
for ($i = 0; $i -lt ($width * $height); $i++) {
    $pixels += @(130, 192, 255, 0)
}

$icoFile = $header + $entry + $bih + $pixels
[System.IO.File]::WriteAllBytes("G:\code\novel_manager_v3.1.0\tauri\src-tauri\icons\icon.ico", $icoFile)
Write-Host "Icon created: $($icoFile.Length) bytes"
