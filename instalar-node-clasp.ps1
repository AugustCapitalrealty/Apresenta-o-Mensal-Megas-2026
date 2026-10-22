# Reinstala Node (portátil, sem administrador) e clasp na pasta do usuário.
# O C: desta máquina tem Deep Freeze: rode de novo depois de cada reinício.
#   powershell -ExecutionPolicy Bypass -File instalar-node-clasp.ps1
# Depois, `clasp login` (abre o navegador) antes do primeiro `clasp push`.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'

$versao = 'v24.22.0'
$sha256 = 'f9683a19877e12a9b167305c8db71040d812876359de21f0d2e97c3f321f80c3'   # SHASUMS256.txt do nodejs.org
$nome   = "node-$versao-win-x64"
$destino = Join-Path $env:LOCALAPPDATA 'node'
$nodeDir = Join-Path $destino $nome

if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
  $zip = Join-Path $env:TEMP "$nome.zip"
  Write-Host "Baixando $nome..."
  Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$versao/$nome.zip" -OutFile $zip
  $h = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($h -ne $sha256) { throw "SHA256 não confere ($h). Download corrompido ou adulterado." }
  New-Item -ItemType Directory -Force $destino | Out-Null
  Expand-Archive $zip -DestinationPath $destino -Force
  Remove-Item $zip
}

# PATH do usuário (terminais novos) e desta sessão.
$pathUsuario = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($pathUsuario -split ';') -notcontains $nodeDir) {
  [Environment]::SetEnvironmentVariable('Path', ($nodeDir + ';' + $pathUsuario).TrimEnd(';'), 'User')
}
if (($env:Path -split ';') -notcontains $nodeDir) { $env:Path = $nodeDir + ';' + $env:Path }

# No Node portátil o "npm -g" instala dentro da própria pasta do Node (já no PATH).
if (-not (Test-Path (Join-Path $nodeDir 'clasp.cmd'))) {
  Write-Host 'Instalando clasp...'
  & (Join-Path $nodeDir 'npm.cmd') install -g '@google/clasp@3.4.1' --no-fund --no-audit
}

Write-Host ("node " + (& (Join-Path $nodeDir 'node.exe') --version))
Write-Host ("clasp " + (& (Join-Path $nodeDir 'clasp.cmd') --version))
