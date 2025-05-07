minify cmd:

cd ./file/files
docker run --rm -it -v "${PWD}:/workspace" xueweihan/html-js-minifier /workspace/min.sh 100



old commands:
https://github.com/javascript-obfuscator/javascript-obfuscator
https://wwilsman.github.io/Datepicker.js/
https://eslint.org/
https://github.com/DVLP/localStorageDB
https://github.com/kangax/html-minifier


npm fund

npx eslint swim.js

javascript-obfuscator swim.js -o swim.min.js --config config.json

npm install html-minifier -g