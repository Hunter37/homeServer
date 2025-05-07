#!/bin/bash
set -e

start_time=$(date +%s)

echo "Minifying swim.js..."

# Default repeat value
repeat=${1:-10}

min_js_content=""
min_js_file_size=$(stat -c%s "swim.js")

for ((i=0; i<repeat; i++)); do
    percent=$((i * 100 / repeat))
    echo -ne "Compress: $percent% Complete [$min_js_file_size]\r"

    javascript-obfuscator swim.js -o swim.min.js --config config.json > /dev/null

    # Get the file size of the minified JS
    current_file_size=$(stat -c%s "swim.min.js")

    # If the current file size is smaller, update the min_js_content and min_js_file_size
    if ((current_file_size < min_js_file_size)); then
        min_js_file_size=$current_file_size
        min_js_content=$(<swim.min.js)
    fi
done
echo -ne "Compress: 100% Complete [$min_js_file_size]\n"

compress_rate=$((min_js_file_size * 100 / $(stat -c%s "swim.js")))
echo "Using the smallest minified JS file with size $min_js_file_size bytes [$compress_rate%]"

# Remove the minified JS file
rm -f swim.min.js

echo "Merging swim.html and swim.css..."
# Read the content of swim.html
html_content=$(<swim.html)

# Read the content of swim.css
css_content=$(<swim.css)

# Replace the link tag with the style content
updated_html_content="${html_content//<link rel=\"stylesheet\" href=\"swim.css\" \/>/<style>$css_content</style>}"

echo "Generating swim.min.html..."
echo "$updated_html_content" > swim.min.html

echo "Minifying swim.html..."
html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true -o swim.min.html swim.min.html
echo "Generating swim.min.html..."
# Read the content of swim.min.html
html_content=$(<swim.min.html)

# Replace the script tag with the minified JS content

escaped_min_js_content=$(printf '%s\n' "$min_js_content" | sed 's/[&]/\\&/g')
updated_html_content="${html_content//<script src=\"swim.js\"><\/script>/<script>$escaped_min_js_content<\/script>}"
# the $min_js_content contains &, so the need to escape it, or use below script
# updated_html_content=$(echo "${html_content//<script src=\"swim.js\"><\/script>/}"\<script\>"$min_js_content"\</script\>)

# Save the updated content to swim.min.html
echo "$updated_html_content" > swim.min.html
echo "$updated_html_content" > swim.dbg.html

compressed_size=$(stat -c%s "swim.min.html")
original_size=$(( $(stat -c%s "swim.html") + $(stat -c%s "swim.css") + $(stat -c%s "swim.js") ))
compress_rate=$((compressed_size * 100 / original_size))
echo "Compressed size $compressed_size bytes [$compress_rate%]"

# List swim.* files
ls -l swim.*

end_time=$(date +%s)
run_time=$((end_time - start_time))
echo "Total runtime: $run_time seconds"