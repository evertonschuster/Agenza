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

# Absolute path: the paths written to certificates.env must not depend on the service's working directory.
$Directory = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Directory)
$signingPath = Join-Path $Directory 'signing.pfx'
$encryptionPath = Join-Path $Directory 'encryption.pfx'
$envFile = Join-Path $Directory 'certificates.env'

foreach ($file in @($signingPath, $encryptionPath, $envFile)) {
    if ((Test-Path -LiteralPath $file) -and -not $Force) {
        throw "$file already exists; refusing to overwrite (-Force replaces it and invalidates issued tokens)."
    }
}

function Set-OwnerOnlyAccess {
    param([string] $Path, [bool] $IsDirectory)

    if ($onWindows) {
        # Protect the ACL (drops inherited grants), then drop every explicit grant before adding the owner's.
        $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
        $flags = if ($IsDirectory) { 'ContainerInherit, ObjectInherit' } else { 'None' }
        # Loading only the Access section keeps Set-Acl from needing SeSecurityPrivilege (audit rules).
        $acl = if ($IsDirectory) { New-Object System.Security.AccessControl.DirectorySecurity($Path, 'Access') } else { New-Object System.Security.AccessControl.FileSecurity($Path, 'Access') }
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($existing in @($acl.Access)) { [void] $acl.RemoveAccessRule($existing) }
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', $flags, 'None', 'Allow')))
        # Set-Acl also writes the owner and audit sections, which needs SeSecurityPrivilege on an existing item.
        if ($PSVersionTable.PSEdition -eq 'Core') {
            if ($IsDirectory) { [System.IO.FileSystemAclExtensions]::SetAccessControl((New-Object System.IO.DirectoryInfo($Path)), $acl) }
            else { [System.IO.FileSystemAclExtensions]::SetAccessControl((New-Object System.IO.FileInfo($Path)), $acl) }
        }
        elseif ($IsDirectory) { [System.IO.Directory]::SetAccessControl($Path, $acl) }
        else { [System.IO.File]::SetAccessControl($Path, $acl) }
    }
    else {
        # Another owner would keep access to the credentials whatever the mode (typical when run as root).
        if ($IsDirectory -and (& stat -c %u $Path) -ne (& id -u)) {
            throw "$Path is owned by another user; use a directory owned by the user running this script."
        }
        & chmod $(if ($IsDirectory) { '700' } else { '600' }) $Path
        if ($LASTEXITCODE -ne 0) { throw "Could not restrict access to $Path." }
    }
}

New-Item -ItemType Directory -Force -Path $Directory | Out-Null
Set-OwnerOnlyAccess -Path $Directory -IsDirectory $true

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

foreach ($file in @($signingPath, $encryptionPath, $envFile)) {
    Set-OwnerOnlyAccess -Path $file -IsDirectory $false
}

if (-not $onWindows) {
    & getent group $Group *> $null
    if ($LASTEXITCODE -eq 0) {
        & chgrp $Group $Directory $signingPath $encryptionPath $envFile
        if ($LASTEXITCODE -ne 0) { throw "Could not assign group '$Group'." }
        & chmod 750 $Directory
        if ($LASTEXITCODE -ne 0) { throw "Could not set permissions on $Directory." }
        & chmod 640 $signingPath $encryptionPath $envFile
        if ($LASTEXITCODE -ne 0) { throw 'Could not set the final permissions.' }
    }
    else {
        Write-Warning "Group '$Group' not found; files left readable only by the current user."
    }
}

Write-Host "Generated $signingPath and $encryptionPath (valid for $Days days)."
Write-Host "Load $envFile as an environment file of the identity service and restart it."
Write-Host "Back up $Directory somewhere protected: losing it invalidates every issued token."
