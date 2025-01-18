Write-Output "Minifying swim.js..."

# param([Int32]$repeat=30) 
$repeat = $args[0]
if (-not $repeat) {
    $repeat = 10
}

$minJsContent = ""
$minJsFileSize = (Get-Item -Path "swim.js").Length

for ($i = 0; $i -lt $repeat; $i++) {
    $percent = [int]($i / $repeat * 100)
    Write-Progress -Activity "Compress" -Status "$percent% Complete [$minJsFileSize]" -PercentComplete $percent
    javascript-obfuscator swim.js -o swim.min.js --config config.json > $null

    # Get the file size of the minified JS
    $currentFileSize = (Get-Item -Path "swim.min.js").Length

    # If the current file size is smaller, update the minJsContent and minJsFileSize
    if ($currentFileSize -lt $minJsFileSize) {
        $minJsFileSize = $currentFileSize
        $minJsContent = Get-Content -Path "swim.min.js" -Raw
    }
}

$compressRate = [int]($minJsFileSize / (Get-Item -Path "swim.js").Length * 100)
Write-Output "Using the smallest minified JS file with size $minJsFileSize bytes [$compressRate%]"

# Remove the minified JS file
Remove-Item -Path "swim.min.js"

Write-Output "Merging swim.html and swim.css..."
# Read the content of swim.html
$htmlContent = Get-Content -Path "swim.html" -Raw

# Read the content of swim.css
$cssContent = Get-Content -Path "swim.css" -Raw

# Replace the link tag with the style content
$updatedHtmlContent = $htmlContent -replace '<link rel="stylesheet" href="swim.css" />', "<style>$cssContent</style>"

Write-Output "Generating swim.html..."
Set-Content -Path "swim.min.html" -Value $updatedHtmlContent

Write-Output "Minifying swim.html..."
html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true -o swim.min.html swim.min.html

Write-Output "Generating swim.min.html..."
# Read the content of swim.html
$htmlContent = Get-Content -Path "swim.min.html" -Raw

# Replace the script tag with the minified JS content
$updatedHtmlContent = $htmlContent -replace '<script src="swim.js"></script>', "<script>$minJsContent</script>"

# Save the updated content to swim.min.html
Set-Content -Path "swim.min.html" -Value $updatedHtmlContent
Set-Content -Path "swim1.min.html" -Value $updatedHtmlContent

$compressRate = [int]((Get-Item -Path "swim.min.html").Length / ((Get-Item -Path "swim.html").Length + (Get-Item -Path "swim.css").Length + (Get-Item -Path "swim.js").Length ) * 100)
Write-Output "Compressed size $((Get-Item -Path "swim.min.html").Length) bytes [$compressRate%]"

# ls swim.*
