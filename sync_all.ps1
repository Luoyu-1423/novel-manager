$base = "c:\Users\Administrator\Desktop\novel_manager_v3.1.0"

# Targets
$desktopJs = "$base\desktop\www\static\js"
$androidWwwJs = "$base\novel_manager_android\www\static\js"
$assetsJs = "$base\novel_manager_android\android\app\src\main\assets\public\static\js"
$desktopCss = "$base\desktop\www\static\css"
$androidWwwCss = "$base\novel_manager_android\www\static\css"
$assetsCss = "$base\novel_manager_android\android\app\src\main\assets\public\static\css"

# 1. Sync module files from root source to all targets
Write-Host "=== Syncing module files ==="
$srcModules = "$base\static\js\modules"
$targets = @($desktopJs, $androidWwwJs, $assetsJs)
if (Test-Path $srcModules) {
    $modFiles = Get-ChildItem "$srcModules\*.js"
    foreach ($f in $modFiles) {
        foreach ($t in $targets) {
            $modDir = "$t\modules"
            if (!(Test-Path $modDir)) { New-Item -ItemType Directory -Path $modDir -Force | Out-Null }
            Copy-Item $f.FullName "$modDir\$($f.Name)" -Force
        }
    }
    Write-Host "  Synced $($modFiles.Count) module files to all targets"
}

# 2. Sync core shared JS files
Write-Host "=== Syncing core JS files ==="
$coreFiles = @("module_registry.js", "legacy_modules_register.js")
foreach ($f in $coreFiles) {
    $src = "$base\static\js\$f"
    if (Test-Path $src) {
        foreach ($t in $targets) {
            Copy-Item $src "$t\$f" -Force
        }
        Write-Host "  Synced $f"
    }
}

# 3. Sync desktop_search.js to desktop only
Write-Host "=== Syncing desktop_search.js ==="
Copy-Item "$desktopJs\desktop_search.js" "$desktopJs\desktop_search.js" -Force
Write-Host "  desktop_search.js already in place"

# 4. Sync CSS
Write-Host "=== Syncing CSS ==="
$cssSrc = "$base\static\css\style.css"
if (Test-Path $cssSrc) {
    foreach ($t in @($desktopCss, $androidWwwCss, $assetsCss)) {
        Copy-Item $cssSrc "$t\style.css" -Force
    }
    Write-Host "  Synced style.css"
}

# 5. Sync HTML files (desktop www -> templates, android www -> assets)
Write-Host "=== Syncing HTML files ==="
Copy-Item "$base\desktop\www\index.html" "$base\templates\index.html" -Force
Write-Host "  Synced desktop HTML -> templates"
Copy-Item "$base\novel_manager_android\www\index.html" "$base\novel_manager_android\android\app\src\main\assets\public\index.html" -Force
Write-Host "  Synced android HTML -> assets"

# 6. Verify
Write-Host ""
Write-Host "=== Verification ==="
$desktopModCount = (Get-ChildItem "$desktopJs\modules\mod_*.js" -ErrorAction SilentlyContinue).Count
$androidModCount = (Get-ChildItem "$androidWwwJs\modules\mod_*.js" -ErrorAction SilentlyContinue).Count
$assetsModCount = (Get-ChildItem "$assetsJs\modules\mod_*.js" -ErrorAction SilentlyContinue).Count
Write-Host "  Desktop modules: $desktopModCount"
Write-Host "  Android www modules: $androidModCount"
Write-Host "  Android assets modules: $assetsModCount"
Write-Host ""
Write-Host "Sync complete!"
