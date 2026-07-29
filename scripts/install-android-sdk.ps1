$ErrorActionPreference = "Stop"

$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"

$javaHome = $null
foreach ($cand in @(
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio1\jbr"
    )) {
    if (Test-Path (Join-Path $cand "bin\java.exe")) {
        $javaHome = $cand
        break
    }
}
if (-not $javaHome -and $env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $javaHome = $env:JAVA_HOME
}
if (-not $javaHome) {
    Write-Error "No Java 17+ found. Install Android Studio or set JAVA_HOME to a JDK."
    exit 1
}
Write-Host "Using JAVA_HOME: $javaHome"

New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null

$zip = Join-Path $env:TEMP "android-cmdline-tools.zip"
Write-Host "Downloading Android command-line tools..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $zip -UseBasicParsing

Write-Host "Extracting..."
$extractTmp = Join-Path $env:TEMP "android-cmdline-tools-extract"
if (Test-Path $extractTmp) { Remove-Item -Recurse -Force $extractTmp }
Expand-Archive -Path $zip -DestinationPath $extractTmp -Force

$cmdlineSrc = Join-Path $extractTmp "cmdline-tools"
$cmdlineLatest = Join-Path $sdkRoot "cmdline-tools\latest"
if (Test-Path (Join-Path $sdkRoot "cmdline-tools")) {
    Remove-Item -Recurse -Force (Join-Path $sdkRoot "cmdline-tools")
}
New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineLatest) | Out-Null
Move-Item -Path $cmdlineSrc -Destination $cmdlineLatest
Remove-Item -Force $zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $extractTmp -ErrorAction SilentlyContinue

$env:JAVA_HOME = $javaHome
$env:ANDROID_SDK_ROOT = $sdkRoot
$sdkmanager = Join-Path $cmdlineLatest "bin\sdkmanager.bat"

Write-Host "Installing SDK packages..."
& $sdkmanager --sdk_root=$sdkRoot --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"

Write-Host "Accepting licenses..."
$yes = "y`n" * 200
$yes | & $sdkmanager --sdk_root=$sdkRoot --licenses

Write-Host ""
Write-Host "SDK installed at: $sdkRoot"
Write-Host "Set ANDROID_HOME to this path for other tools."
