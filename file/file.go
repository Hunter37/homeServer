package file

import (
	"bytes"
	"homeServer/storage"
	"homeServer/utils"
	"html/template"
	"net/http"
	"path/filepath"
)

func FileHandler(writer http.ResponseWriter, req *http.Request) {
	utils.LogHttpCaller(req, false)

	fileName := req.URL.Path
	if fileName == "/files" || fileName == "/files/" {
		files, err := storage.File.List("file/files")
		utils.LogError(err)

		tempFile, err := storage.File.Read("file/html/files.html")
		utils.LogError(err)

		tmpl, err := template.New("files").Parse(string(tempFile))
		utils.LogError(err)

		var buf bytes.Buffer
		err = tmpl.Execute(&buf, files)
		utils.LogError(err)

		writer.Header().Set("Content-Type", "text/html")
		utils.GzipWrite(writer, buf.Bytes(), http.StatusOK)
		return
	}

	fileName = fileName[7:]

	body, err := storage.File.Read("file/files/" + fileName)
	utils.LogError(err)
	if err != nil {
		utils.GzipWrite(writer, nil, http.StatusNotFound)
		return
	}

	writer.Header().Set("Content-Type", getContentType(fileName))
	utils.GzipWrite(writer, body, http.StatusOK)
}

func getContentType(fileName string) string {
	dict := map[string]string{
		".html": "text/html",
		".txt":  "text/plain",
		".css":  "text/css",
		".js":   "text/javascript",
		".json": "text/json",
		".jpg":  "image/jpeg",
	}

	contentType, ok := dict[filepath.Ext(fileName)]
	if !ok {
		contentType = "application/octet-stream"
	}
	return contentType
}
