param([ValidateSet('save','run')][string]$Action = 'run', [string[]]$CliArgs)
$ErrorActionPreference = 'Stop'
$metaDir = Join-Path $PSScriptRoot '.local'
New-Item -ItemType Directory -Path $metaDir -Force | Out-Null
$config = Get-Content -LiteralPath (Join-Path $metaDir 'accounts.json') -Raw | ConvertFrom-Json
$names = @('META_APP_SECRET') + @($config.accounts.tokenEnv | Select-Object -Unique)
foreach ($name in $names) {
    if ($name -notmatch '^META_(APP_SECRET|TOKEN_[A-Z0-9_]+)$') { throw 'Nombre de secreto inválido' }
}
$vault = Join-Path $metaDir 'credentials.xml'
if ($Action -eq 'save') {
    $values = @{}
    foreach ($name in $names) { $values[$name] = Read-Host -Prompt "Introduce $name (entrada oculta)" -AsSecureString }
    $values | Export-Clixml -LiteralPath $vault
    Write-Output 'Credenciales cifradas con DPAPI para este usuario de Windows.'
} else {
    $values = Import-Clixml -LiteralPath $vault
    try {
        foreach ($name in $names) {
            if (-not $values.ContainsKey($name)) { throw "Falta $name" }
            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($values[$name])
            try { [Environment]::SetEnvironmentVariable($name, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer), 'Process') }
            finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
        }
        & node (Join-Path $PSScriptRoot 'cli.mjs') @CliArgs
        $metaExit = $LASTEXITCODE
    } finally {
        foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
    }
    exit $metaExit
}
