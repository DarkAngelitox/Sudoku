$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $nodePath = 'C:\Users\endocer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) {
    Write-Host 'No encontré Node.js. Instala Node.js o abre esta carpeta en el PC donde estás ejecutando Codex.' -ForegroundColor Yellow
    Read-Host 'Presiona Enter para cerrar'
    exit 1
}
& $nodePath (Join-Path $PSScriptRoot 'lan-server.js')
