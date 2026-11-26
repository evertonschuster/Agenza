<#
Generates the permanent OpenIddict signing and encryption certificates (PFX) once per server.
Works on Windows PowerShell 5.1 and PowerShell 7+.

Usage: .\generate-certificates.ps1 [-Directory <path>] [-Days 1825] [-Group agenza-app] [-Force]

Overwriting invalidates every issued token and refresh token, so existing files are never replaced
without -Force. The passwords go only to <Directory>/certificates.env (the four
Identity__Certificates__* variables), which the service reads as an environment file.
#>
[CmdletBinding()]
param(
    [string] $Directory,
    [int] $Days = 1825,
    [string] $Group = 'agenza-app',
    [switch] $Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$onWindows = $env:OS -eq 'Windows_NT'
if (-not $Directory) {
    $Directory = if ($onWindows) { Join-Path $env:ProgramData 'Agenza\identity' } else { '/etc/agenza/identity' }
}

$signingPath = Join-Path $Directory 'signing.pfx'
$encryptionPath = Join-Path $Directory 'encryption.pfx'
$envFile = Join-Path $Directory 'certificates.env'

foreach ($file in @($signingPath, $encryptionPath, $envFile)) {
    if ((Test-Path -LiteralPath $file) -and -not $Force) {
        throw "$file already exists; refusing to overwrite (-Force replaces it and invalidates issued tokens)."
    }
}

New-Item -ItemType Directory -Force -Path $Directory | Out-Null

function New-Password {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 40
    $random.GetBytes($bytes)
    $random.Dispose()
    -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

function New-Pfx {
    param([string] $Path, [string] $CommonName, [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags] $KeyUsage, [string] $Password)

    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    try {
        $request = New-Object System.Security.Cryptography.X509Certificates.CertificateRequest(
            "CN=$CommonName", $rsa,
            [System.Security.Cryptography.HashAlgorithmName]::SHA256,
            [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        $request.CertificateExtensions.Add(
            (New-Object System.Security.Cryptography.X509Certificates.X509KeyUsageExtension($KeyUsage, $true)))

        $now = [DateTimeOffset]::UtcNow
        $certificate = $request.CreateSelfSigned($now.AddMinutes(-5), $now.AddDays($Days))
        try {
            $bytes = $certificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $Password)
            [System.IO.File]::WriteAllBytes($Path, $bytes)
        }
        finally {
            $certificate.Dispose()
        }
    }
    finally {
        $rsa.Dispose()
    }
}

$usages = [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]
$signingPassword = New-Password
$encryptionPassword = New-Password

New-Pfx -Path $signingPath -CommonName 'Agenza Identity Signing' -KeyUsage $usages::DigitalSignature -Password $signingPassword
New-Pfx -Path $encryptionPath -CommonName 'Agenza Identity Encryption' -KeyUsage $usages::KeyEncipherment -Password $encryptionPassword

$content = @(
    "Identity__Certificates__Signing__Path=$signingPath"
    "Identity__Certificates__Signing__Password=$signingPassword"
    "Identity__Certificates__Encryption__Path=$encryptionPath"
    "Identity__Certificates__Encryption__Password=$encryptionPassword"
) -join "`n"
[System.IO.File]::WriteAllText($envFile, $content + "`n", (New-Object System.Text.UTF8Encoding($false)))

if ($onWindows) {
    # Only the current user keeps access; grant the service account on top of this if it differs.
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    foreach ($path in @($Directory, $signingPath, $encryptionPath, $envFile)) {
        $grant = if ($path -eq $Directory) { "*${sid}:(OI)(CI)F" } else { "*${sid}:F" }
        & icacls.exe $path /grant:r $grant | Out-Null
        if ($LASTEXITCODE -eq 0) { & icacls.exe $path /inheritance:r | Out-Null }
        if ($LASTEXITCODE -ne 0) { throw "Could not restrict access to $path." }
    }
}
else {
    & chmod 750 $Directory
    & chmod 640 $signingPath $encryptionPath $envFile
    & getent group $Group *> $null
    if ($LASTEXITCODE -eq 0) {
        & chgrp $Group $Directory $signingPath $encryptionPath $envFile
    }
    else {
        Write-Warning "Group '$Group' not found; files left readable only by the current user."
    }
}

Write-Host "Generated $signingPath and $encryptionPath (valid for $Days days)."
Write-Host "Load $envFile as an environment file of the identity service and restart it."
Write-Host "Back up $Directory somewhere protected: losing it invalidates every issued token."
