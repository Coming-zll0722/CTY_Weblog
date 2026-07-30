[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ArtifactDirectory,

    [string]$SshPrivateKey = "$env:USERPROFILE\.ssh\cty_log_github_actions_ed25519",
    [string]$DeployHost = "111.229.86.99",
    [ValidateRange(1, 65535)]
    [int]$DeployPort = 22,
    [string]$DeployUser = "cty-deploy"
)

$ErrorActionPreference = "Stop"

$artifactRoot = (Resolve-Path -LiteralPath $ArtifactDirectory).Path
$imageArchive = Join-Path $artifactRoot "images.tar.gz"
$checksumFile = Join-Path $artifactRoot "images.tar.gz.sha256"
$metadataFile = Join-Path $artifactRoot "release.env"

foreach ($requiredFile in @($imageArchive, $checksumFile, $metadataFile, $SshPrivateKey)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required file is missing: $requiredFile"
    }
}

$metadata = @{}
foreach ($line in Get-Content -LiteralPath $metadataFile) {
    if ($line -notmatch "^([A-Z_]+)=(.+)$") {
        throw "Invalid release metadata line: $line"
    }
    $metadata[$Matches[1]] = $Matches[2]
}

$releaseId = $metadata.RELEASE_ID
$apiDigest = $metadata.API_DIGEST
$webDigest = $metadata.WEB_DIGEST
$revision = $metadata.GIT_REVISION

if ($releaseId -notmatch "^release-[A-Za-z0-9._-]+$" `
    -or $apiDigest -notmatch "^sha256:[0-9a-f]{64}$" `
    -or $webDigest -notmatch "^sha256:[0-9a-f]{64}$" `
    -or $revision -notmatch "^[0-9a-f]{40}$") {
    throw "Release metadata failed validation."
}

$expectedChecksum = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split "\s+")[0]
$actualChecksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $imageArchive).Hash.ToLowerInvariant()
if ($actualChecksum -ne $expectedChecksum.ToLowerInvariant()) {
    throw "Release image archive checksum mismatch."
}

$sshPath = (Get-Command ssh.exe -ErrorAction Stop).Source

function New-SshProcess {
    param(
        [Parameter(Mandatory)]
        [string]$RemoteCommand,
        [switch]$RedirectInput
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $sshPath
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $RedirectInput
    foreach ($argument in @(
        "-i", $SshPrivateKey,
        "-p", $DeployPort.ToString(),
        "-o", "BatchMode=yes",
        "-o", "IdentitiesOnly=yes",
        "-o", "PasswordAuthentication=no",
        "-o", "StrictHostKeyChecking=yes",
        "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=20",
        "$DeployUser@$DeployHost",
        $RemoteCommand
    )) {
        $startInfo.ArgumentList.Add($argument)
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        throw "Failed to start Windows OpenSSH."
    }
    return $process
}

Write-Host "Loading verified images for $releaseId..."
$loadCommand = "load $releaseId $apiDigest $webDigest $revision"
$loadProcess = New-SshProcess -RemoteCommand $loadCommand -RedirectInput
try {
    $archiveStream = [System.IO.File]::OpenRead($imageArchive)
    try {
        $archiveStream.CopyTo($loadProcess.StandardInput.BaseStream)
    }
    finally {
        $loadProcess.StandardInput.Close()
        $archiveStream.Dispose()
    }
    $loadProcess.WaitForExit()
    if ($loadProcess.ExitCode -ne 0) {
        throw "Remote image loading failed with exit code $($loadProcess.ExitCode)."
    }
}
finally {
    $loadProcess.Dispose()
}

Write-Host "Deploying $releaseId..."
$deployCommand = "deploy $releaseId $apiDigest $webDigest $revision"
$deployProcess = New-SshProcess -RemoteCommand $deployCommand
try {
    $deployProcess.WaitForExit()
    if ($deployProcess.ExitCode -ne 0) {
        throw "Remote deployment failed with exit code $($deployProcess.ExitCode)."
    }
}
finally {
    $deployProcess.Dispose()
}

Write-Host "Release $releaseId completed."
