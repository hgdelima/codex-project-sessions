$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VsixFile = Join-Path $ScriptDir "codex-project-sessions-0.1.0.vsix"
$ChecksumsFile = Join-Path $ScriptDir "SHA256SUMS.txt"

$ExpectedLine = Get-Content $ChecksumsFile | Where-Object { $_ -match "codex-project-sessions-0\.1\.0\.vsix$" } | Select-Object -First 1
if (-not $ExpectedLine) {
    throw "Checksum do VSIX não encontrado."
}

$ExpectedHash = ($ExpectedLine -split "\s+")[0].ToLowerInvariant()
$ActualHash = (Get-FileHash $VsixFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ExpectedHash -ne $ActualHash) {
    throw "Checksum inválido. Esperado: $ExpectedHash. Obtido: $ActualHash."
}

$CodeCommand = Get-Command code -ErrorAction SilentlyContinue
if ($CodeCommand) {
    $CodeBin = $CodeCommand.Source
} else {
    $Candidate = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
    if (-not (Test-Path $Candidate)) {
        throw "VS Code CLI não encontrado. Use Extensions: Install from VSIX..."
    }
    $CodeBin = $Candidate
}

& $CodeBin --install-extension $VsixFile --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "Se a mensagem mencionar allowed list, solicite a entrada:"
    Write-Host '"local.codex-project-sessions": ["0.1.0"]'
    exit $LASTEXITCODE
}

Write-Host "Extensão instalada. Reinicie o VS Code."
