# Verifies the block asset wiring: every registered block has a blockstate, block model,
# item model, both lang entries, and every texture it references actually exists.
# Fails (exit 1) on any missing/malformed piece. Run: powershell -File tools\check_assets.ps1
# Uses JavaScriptSerializer instead of ConvertFrom-Json: PS 5.1's ConvertFrom-Json rejects
# the empty property name ("") that a property-less blockstate legitimately uses.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer

$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'src\main\resources\assets\crabsense_ras'
$src = Join-Path $root 'src\main\java\com\crabsense\ras\block\RasBlocks.java'

$errors = New-Object System.Collections.Generic.List[string]
function Fail([string]$m) { $errors.Add($m) }

function Read-Json([string]$path) { $ser.DeserializeObject((Get-Content -Raw $path)) }

# Blocks are declared as register("name", ...) in RasBlocks.java.
$names = [regex]::Matches((Get-Content -Raw $src), 'register\("([a-z0-9_]+)"') |
	ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
if (@($names).Count -eq 0) { Fail 'No register("name", ...) calls found in RasBlocks.java' }

foreach ($name in $names) {
	foreach ($rel in @("blockstates\$name.json", "models\block\$name.json", "models\item\$name.json", "items\$name.json")) {
		if (-not (Test-Path (Join-Path $assets $rel))) { Fail "missing $rel" }
	}
	# Since 1.21.4 an item needs assets/<ns>/items/<name>.json or it renders as a
	# missing-texture checkerboard in inventories; the block state alone is not enough.
	$idef = Join-Path $assets "items\$name.json"
	if (Test-Path $idef) {
		$j = Read-Json $idef
		if (-not ($j.ContainsKey('model'))) { Fail "items/$name.json has no 'model' (1.21.4+ item definition shape)" }
	}
	foreach ($lang in 'en_us', 'vi_vn') {
		$json = Read-Json (Join-Path $assets "lang\$lang.json")
		foreach ($key in "block.crabsense_ras.$name", "item.crabsense_ras.$name") {
			if (-not $json.ContainsKey($key)) { Fail "lang/$lang.json missing $key" }
		}
	}
}

# Every JSON asset must parse, and every block-model texture must exist.
$res = Join-Path $root 'src\main\resources'
foreach ($f in Get-ChildItem -Path $res -Recurse -File -Filter *.json) {
	try { $j = Read-Json $f.FullName } catch { Fail "invalid JSON: $($f.Name)"; continue }
	if ($f.DirectoryName -like '*\models\block*' -and $j.ContainsKey('textures')) {
		foreach ($ref in $j['textures'].Values) {
			if ($ref -notmatch '^crabsense_ras:') { continue }
			$rel = ($ref -replace '^crabsense_ras:', '') -replace '/', '\'
			$png = Join-Path (Join-Path $assets 'textures') ($rel + '.png')
			if (-not (Test-Path $png)) { Fail "model $($f.Name) references missing texture $ref" }
			# An animated texture is a vertical strip: its height must divide into
			# whole square frames, or Minecraft renders it squashed.
			$meta = "$png.mcmeta"
			if (Test-Path $meta) {
				Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
				$img = [System.Drawing.Image]::FromFile($png)
				if ($img.Height % $img.Width -ne 0) {
					Fail "$([IO.Path]::GetFileName($png)) is animated but $($img.Width)x$($img.Height) is not a whole number of square frames"
				}
				$img.Dispose()
			}
		}
	}
}

if ($errors.Count -gt 0) {
	Write-Output "FAIL ($($errors.Count)):"
	$errors | ForEach-Object { Write-Output "  - $_" }
	exit 1
}
Write-Output "PASS: $(@($names).Count) blocks fully wired ($($names -join ', '))"
