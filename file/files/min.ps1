javascript-obfuscator swim.js -o swim.min.js --config config.json

# Read the content of swim.html
$htmlContent = Get-Content -Path "swim.html" -Raw

# Read the content of swim.min.js
$minJsContent = Get-Content -Path "swim.min.js" -Raw

# Replace the script tag with the minified JS content
$updatedHtmlContent = $htmlContent -replace '<script src="swim.js"></script>', "<script>$minJsContent</script>"

# Save the updated content to swim.min.html
Set-Content -Path "swim.min.html" -Value $updatedHtmlContent