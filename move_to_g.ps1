# Step 1: Clean up C drive
Write-Host "=== Cleaning C drive ==="

# Clean temp
Get-ChildItem "$env:TEMP" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Temp cleaned"

# Clean npm cache
npm cache clean --force 2>$null
Write-Host "npm cache cleaned"

# Remove node_modules and build artifacts from project
$cleanPaths = @(
    "c:\Users\Administrator\Desktop\novel_manager_v3.1.0\desktop\node_modules",
    "c:\Users\Administrator\Desktop\novel_manager_v3.1.0\desktop\dist",
    "c:\Users\Administrator\Desktop\novel_manager_v3.1.0\novel_manager_android\node_modules",
    "c:\Users\Administrator\Desktop\novel_manager_v3.1.0\novel_manager_android\android\app\build",
    "c:\Users\Administrator\Desktop\novel_manager_v3.1.0\novel_manager_android\android\.gradle"
)
foreach ($p in $cleanPaths) {
    if (Test-Path $p) {
        Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed: $p"
    }
}

# Check free space
$free = (Get-PSDrive C).Free / 1GB
Write-Host ("C drive free after cleanup: {0:N2} GB" -f $free)

# Step 2: Move project to G:\code
Write-Host "`n=== Moving project to G:\code ==="
$src = "c:\Users\Administrator\Desktop\novel_manager_v3.1.0"
$dst = "G:\code\novel_manager_v3.1.0"

if (!(Test-Path "G:\code")) { New-Item -ItemType Directory -Path "G:\code" -Force }

# Use robocopy for reliable move (handles long paths, preserves structure)
robocopy $src $dst /E /MOVE /R:1 /W:1 /NFL /NDL /NJH /NJS
Write-Host "Project moved to $dst"

# Step 3: Move .cargo and .rustup to G:\code
Write-Host "`n=== Moving Rust toolchain to G:\code ==="
$cargoSrc = "$env:USERPROFILE\.cargo"
$cargoDst = "G:\code\.cargo"
$rustupSrc = "$env:USERPROFILE\.rustup"
$rustupDst = "G:\code\.rustup"

if (Test-Path $cargoSrc) {
    robocopy $cargoSrc $cargoDst /E /MOVE /R:1 /W:1 /NFL /NDL /NJH /NJS
    Write-Host ".cargo moved"
}
if (Test-Path $rustupSrc) {
    robocopy $rustupSrc $rustupDst /E /MOVE /R:1 /W:1 /NFL /NDL /NJH /NJS
    Write-Host ".rustup moved"
}

# Step 4: Set environment variables (user-level, persistent)
Write-Host "`n=== Setting environment variables ==="
[System.Environment]::SetEnvironmentVariable("CARGO_HOME", "G:\code\.cargo", "User")
[System.Environment]::SetEnvironmentVariable("RUSTUP_HOME", "G:\code\.rustup", "User")

# Update PATH: remove old cargo path, add new one
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$userPath = $userPath -replace [regex]::Escape("$env:USERPROFILE\.cargo\bin;"), ""
if ($userPath -notlike "G:\code\.cargo\bin*") {
    $userPath = "G:\code\.cargo\bin;" + $userPath
}
[System.Environment]::SetEnvironmentVariable("Path", $userPath, "User")
Write-Host "Environment variables set"

# Apply to current session
$env:CARGO_HOME = "G:\code\.cargo"
$env:RUSTUP_HOME = "G:\code\.rustup"
$env:Path = "G:\code\.cargo\bin;" + $env:Path

# Verify
Write-Host "`n=== Verification ==="
$free = (Get-PSDrive C).Free / 1GB
Write-Host ("C drive free: {0:N2} GB" -f $free)
Write-Host ("Project at: {0}" -f (Test-Path $dst))
Write-Host ("Cargo at: {0}" -f (Test-Path $cargoDst))
Write-Host ("Rustup at: {0}" -f (Test-Path $rustupDst))
rustc --version 2>$null
cargo --version 2>$null
Write-Host "`n=== Done! ==="
