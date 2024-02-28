package storage

import (
	"bytes"
	"context"
	"os"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

var (
	File FileStorage = &LocalFile{}
)

type FileStorage interface {
	Read(path string) ([]byte, error)
	Write(path string, data []byte) error
}

type LocalFile struct{}

func (f *LocalFile) Read(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func (f *LocalFile) Write(path string, data []byte) error {
	return os.WriteFile(path, data, 0o600)
}

type AzureBlobFile struct {
	client *azblob.Client
}

func (f *AzureBlobFile) Read(path string) ([]byte, error) {
	container, file := getAzureBlobFilePath(path)

	// Download the blob
	ctx := context.Background()
	get, err := f.client.DownloadStream(ctx, container, file, nil)
	if err != nil {
		return nil, err
	}

	var downloadedData bytes.Buffer
	retryReader := get.NewRetryReader(ctx, &azblob.RetryReaderOptions{})
	defer retryReader.Close()

	_, err = downloadedData.ReadFrom(retryReader)
	return downloadedData.Bytes(), err
}

func (f *AzureBlobFile) Write(path string, data []byte) error {
	container, file := getAzureBlobFilePath(path)
	_, err := f.client.UploadBuffer(context.Background(), container, file, data, &azblob.UploadBufferOptions{})
	return err
}

func (f *AzureBlobFile) Init() error {
	url := "https://homeserverdata.blob.core.windows.net/"

	// credential, err := azidentity.NewClientSecretCredential(
	// 	os.Getenv("TENANT_ID"),
	// 	os.Getenv("CLIENT_ID"),
	// 	os.Getenv("CLIENT_SECRET"),
	// 	nil)

	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return err
	}

	f.client, err = azblob.NewClient(url, credential, nil)
	return err
}

func getAzureBlobFilePath(path string) (string, string) {
	idx := strings.LastIndex(path, "/")
	return strings.ReplaceAll(path[:idx], "/", "-"), path[idx+1:]
}
