# Previews the mod's block/item models WITHOUT launching Minecraft.
#
# Runs the headless Blockbench MCP server straight from the CLI:
#   block model .json  ->  .bbmodel  ->  rendered PNGs (6 views)
#
# Usage:
#   powershell -File tools\preview.ps1
#   powershell -File tools\preview.ps1 -Blocks crab_box,drum_filter
#   powershell -File tools\preview.ps1 -WebLinks      # also print 3D web-app links
#
# Output: preview\renders\<block>-<view>.png  (front, right, back, left, three-quarter, top)
# Needs the blockbench-mcp package (see .cursor\mcp.json) and its bundled bun.
param(
	[string[]]$Blocks = @('tank', 'pump', 'rack', 'crab_box', 'drum_filter'),
	[ValidateRange(64, 2048)][int]$Size = 384,
	[switch]$WebLinks
)
$ErrorActionPreference = 'Stop'

$Root = Split-Path $PSScriptRoot -Parent
$Preview = Join-Path $Root 'preview'
$Bun = 'C:\Users\ADMIN\blockbench-mcp\node_modules\bun\bin\bun.exe'
$Call = 'C:\Users\ADMIN\blockbench-mcp\node_modules\blockbench-mcp\headless\call.ts'
if (-not (Test-Path $Bun)) { throw "bun not found: $Bun (reinstall the blockbench MCP package)" }
if (-not (Test-Path $Call)) { throw "headless server not found: $Call" }
$env:PATH = (Split-Path $Bun) + ';' + $env:PATH

# The importer needs a resource-pack layout to find textures, so mirror the mod's assets here.
# Copy the *contents* of assets/ (not the directory) so repeated runs never nest
# preview\assets\assets — the usual Copy-Item -Recurse trap when the target exists.
New-Item -ItemType Directory -Force $Preview | Out-Null
$assetsMirror = Join-Path $Preview 'assets'
Remove-Item $assetsMirror -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $assetsMirror) { throw "cannot clear $assetsMirror (a process is holding it)" }
New-Item -ItemType Directory -Force $assetsMirror | Out-Null
Copy-Item (Join-Path $Root 'src\main\resources\assets\*') $assetsMirror -Recurse -Force
$Renders = Join-Path $Preview 'renders'
New-Item -ItemType Directory -Force $Renders | Out-Null

function Invoke-Tool([string]$tool, [hashtable]$arguments) {
	$argsFile = Join-Path $Preview 'args.tmp.json'
	Set-Content -Path $argsFile -Value ($arguments | ConvertTo-Json -Compress -Depth 8) -NoNewline
	$out = & $Bun run $Call --root $Preview $tool "@$argsFile" 2>&1
	if ($LASTEXITCODE -ne 0) { throw "$tool failed: $($out -join ' ')" }
	return $out
}

foreach ($block in $Blocks) {
	$model = "assets/crabsense_ras/models/block/$block.json"
	if (-not (Test-Path (Join-Path $Preview $model))) { Write-Warning "no model for '$block'"; continue }

	$import = (Invoke-Tool 'bbmodel_import_java_block' @{
			model = $model; output = "$block.bbmodel"; resource_packs = @('.'); resolve_parents = $false; overwrite = $true
		}) -join "`n"
	$meta = $import | ConvertFrom-Json
	$warn = if ($meta.counts.cubes -eq 0) { '  <-- 0 cubes: model is parent-only (cube_all), give it elements to see a shape' } else { '' }
	Write-Output "$block : cubes=$($meta.counts.cubes) textures=$($meta.counts.embedded_textures)$warn"
	if ($WebLinks) { Write-Output "  web: $($meta.web_app.url)" }

	foreach ($line in (Invoke-Tool 'bbmodel_contact_sheet' @{ file = "$block.bbmodel"; size = $Size })) {
		if ($line -match '^([a-z-]+): (.+\.png)$' -and (Test-Path $Matches[2])) {
			$dest = Join-Path $Renders "$block-$($Matches[1]).png"
			Copy-Item $Matches[2] $dest -Force
			Write-Output "  render: preview\renders\$block-$($Matches[1]).png"
		}
	}
}
Remove-Item (Join-Path $Preview 'args.tmp.json') -Force -ErrorAction SilentlyContinue
Write-Output "done."
