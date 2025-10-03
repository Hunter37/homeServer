FROM node:18-alpine

COPY min.sh /min.sh

RUN apk add --no-cache bash dos2unix && \
    dos2unix /min.sh && \
    npm install -g javascript-obfuscator && \
    npm install -g html-minifier

WORKDIR /workspace

CMD ["bash"]

# docker build -t xueweihan/html-js-minifier .
# docker push xueweihan/html-js-minifier

# linux:
# docker run --rm -it -v $(pwd):/workspace xueweihan/html-js-minifier /min.sh 100

# windows:
# docker run --rm -it -v "${PWD}:/workspace" xueweihan/html-js-minifier /min.sh 100