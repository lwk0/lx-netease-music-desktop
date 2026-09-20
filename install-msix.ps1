<#
.SYNOPSIS
    LX-N Music 桌面版 —— MSIX(.appx) 一键安装脚本

.DESCRIPTION
    自动完成两件事：
      1) 把随包的自签名代码签名证书导入「受信任人(TrustedPeople)」与
         「受信任的根证书颁发机构(Root)」，让 Windows 信任本安装包的发布者
         （自签名包必须先把证书登记到本机信任库，否则 Add-AppxPackage 会报
          0x800B0109 / 证书链不受信任）。
      2) 用 Add-AppxPackage 安装或更新 LX-N Music（已安装时走强制覆盖更新，
         保留用户数据）。

    导入 LocalMachine 证书存储 + 安装 AppX 都需要管理员权限，脚本会自动 UAC 提权。

.PARAMETER AppxPath
    .appx / .msix 安装包路径。默认自动查找：脚本同目录 → 脚本同目录下的 build\ → 当前目录。

.PARAMETER CertPath
    证书路径。优先 .cer（仅公钥，适合分发），也支持带私钥的 .pfx。
    默认自动查找脚本同目录下的 .cer / .pfx。

.PARAMETER CertPassword
    当证书为 .pfx 时使用的密码，默认 123456。

.PARAMETER Launch
    安装完成后自动启动应用。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-msix.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-msix.ps1 -Launch
#>

[CmdletBinding()]
param(
    [string]$AppxPath,
    [string]$CertPath,
    [string]$CertPassword = '123456',
    [switch]$Launch
)

$ErrorActionPreference = 'Stop'

# 包清单中的 Identity Name（electron-builder: appx.identityName）
$PackageIdentityName = 'lx-netease-music-desktop'
# 清单中的 Application Id（electron-builder: appx.applicationId）
$AppUserModelId = 'lx.netease.music.desktop'

function Write-Info([string]$m)  { Write-Host "[*] $m" -ForegroundColor Cyan }
function Write-Ok([string]$m)    { Write-Host "[+] $m" -ForegroundColor Green }
function Write-Warn2([string]$m) { Write-Host "[!] $m" -ForegroundColor Yellow }
function Write-Err([string]$m)   { Write-Host "[x] $m" -ForegroundColor Red }

function Pause-And-Exit([int]$code) {
    try { Read-Host '按回车键退出' | Out-Null } catch { }
    exit $code
}

# ============================ 1. 提权 ============================
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin   = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Warn2 '需要管理员权限，正在请求提权（会弹出 UAC 确认框）...'
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }

    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptPath`"")
    if ($AppxPath)     { $argList += @('-AppxPath', "`"$AppxPath`"") }
    if ($CertPath)     { $argList += @('-CertPath', "`"$CertPath`"") }
    if ($CertPassword) { $argList += @('-CertPassword', "`"$CertPassword`"") }
    if ($Launch)       { $argList += '-Launch' }

    $self = (Get-Process -Id $PID).Path
    if (-not $self) { $self = 'powershell.exe' }
    try {
        Start-Process -FilePath $self -Verb RunAs -ArgumentList $argList
    } catch {
        Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
    }
    exit
}

Write-Ok '已获取管理员权限'

# ============================ 2. 定位文件 ============================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

function Find-FirstFile([string[]]$dirs, [string[]]$exts) {
    foreach ($d in $dirs) {
        if (-not $d -or -not (Test-Path -LiteralPath $d)) { continue }
        $hit = Get-ChildItem -LiteralPath $d -File -ErrorAction SilentlyContinue |
               Where-Object { $exts -contains $_.Extension.ToLower() } |
               Sort-Object LastWriteTime -Descending |
               Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return $null
}

# 安装包
if (-not $AppxPath) {
    $AppxPath = Find-FirstFile @($ScriptDir, (Join-Path $ScriptDir 'build'), (Get-Location).Path) @('.appx', '.msix')
}
if (-not $AppxPath -or -not (Test-Path -LiteralPath $AppxPath)) {
    Write-Err '未找到 .appx / .msix 安装包。请把本脚本与安装包放在同一目录，或用 -AppxPath 指定路径。'
    Pause-And-Exit 1
}
$AppxPath = (Resolve-Path -LiteralPath $AppxPath).Path
Write-Info "安装包: $AppxPath"

# 证书
if (-not $CertPath) {
    $CertPath = Find-FirstFile @($ScriptDir, (Get-Location).Path) @('.cer')
    if (-not $CertPath) { $CertPath = Find-FirstFile @($ScriptDir, (Get-Location).Path) @('.pfx') }
}

$certInstalled = $false
if ($CertPath -and (Test-Path -LiteralPath $CertPath)) {
    $CertPath = (Resolve-Path -LiteralPath $CertPath).Path
    Write-Info "证书  : $CertPath"

    try {
        if ([IO.Path]::GetExtension($CertPath).ToLower() -eq '.pfx') {
            $raw  = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath, $CertPassword)
        } else {
            $raw  = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath)
        }
        # 只取公钥部分再入库（不要把私钥写进受信任存储）
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
            $raw.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
        Write-Info "发布者: $($cert.Subject)"

        foreach ($storeName in @('TrustedPeople', 'Root')) {
            try {
                $store = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, 'LocalMachine')
                $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
                $exists = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
                if ($exists) {
                    Write-Ok "证书已存在于 LocalMachine\$storeName（跳过）"
                } else {
                    $store.Add($cert)
                    Write-Ok "证书已导入 LocalMachine\$storeName"
                }
                $store.Close()
                $certInstalled = $true
            } catch {
                Write-Warn2 "导入 LocalMachine\$storeName 失败: $($_.Exception.Message)"
            }
        }
    } catch {
        Write-Warn2 "证书解析/导入失败: $($_.Exception.Message)"
    }
} else {
    Write-Warn2 '未找到证书文件（.cer/.pfx）。'
    Write-Host '    若本机此前已信任过该发布者，可忽略；否则请用 -CertPath 指定证书。'
}

# ============================ 3. 安装 ============================
Write-Info '正在安装/更新应用...'
$installed = Get-AppxPackage -Name $PackageIdentityName -ErrorAction SilentlyContinue
$ok = $false

try {
    if ($installed) {
        Write-Info "检测到已安装版本 $($installed.Version)，执行更新（保留数据）..."
        Add-AppxPackage -Path $AppxPath -ForceUpdateFromAnyVersion -ForceApplicationShutdown
    } else {
        Add-AppxPackage -Path $AppxPath
    }
    $ok = $true
} catch {
    Write-Warn2 "常规安装失败: $($_.Exception.Message)"
    Write-Info '尝试以「强制覆盖任意版本」方式重试...'
    try {
        Add-AppxPackage -Path $AppxPath -ForceUpdateFromAnyVersion -ForceApplicationShutdown
        $ok = $true
    } catch {
        Write-Err "安装失败: $($_.Exception.Message)"
    }
}

if (-not $ok) {
    Write-Host ''
    Write-Warn2 '排查建议：'
    Write-Host '  1) 打开「设置 → 系统 → 开发者选项」，允许“旁加载应用”或开启“开发人员模式”；'
    Write-Host '  2) 确认证书已导入“受信任人(TrustedPeople)”，且其 Subject 与包内发布者一致；'
    Write-Host '  3) 若已安装更高版本，先卸载再装：'
    Write-Host "     Get-AppxPackage $PackageIdentityName | Remove-AppxPackage"
    Write-Host '  4) 查看签名详情：Get-AuthenticodeSignature -FilePath "<安装包路径>"'
    Pause-And-Exit 1
}

$pkg = Get-AppxPackage -Name $PackageIdentityName -ErrorAction SilentlyContinue
if ($pkg) {
    Write-Ok "安装成功：$($pkg.Name)  v$($pkg.Version)"
    Write-Info "安装位置：$($pkg.InstallLocation)"
} else {
    Write-Ok '安装成功！'
}

# ============================ 4. 可选启动 ============================
if ($Launch) {
    if ($pkg) {
        $aumid = "$($pkg.PackageFamilyName)!$AppUserModelId"
        Write-Info "启动应用: $aumid"
        try {
            Start-Process ("shell:AppsFolder\" + $aumid)
        } catch {
            Write-Warn2 "自动启动失败，请从开始菜单手动打开『LX-N Music』: $($_.Exception.Message)"
        }
    }
} else {
    Write-Info '安装完成，可从开始菜单打开「LX-N Music」（或加 -Launch 参数自动启动）。'
}

if (-not $certInstalled) {
    Write-Warn2 '注意：本次未导入证书。若应用无法启动/更新，请确认发布者证书已受信任。'
}

Pause-And-Exit 0
