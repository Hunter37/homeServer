package storage

import (
	"bytes"
	"context"
	"os"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

var (
	File FileStorage = LocalFile{}

	_azureCredential azcore.TokenCredential

	_blobClient *azblob.Client
)

func GetAzureCredential() azcore.TokenCredential {
	if _azureCredential == nil {
		var err error
		if os.Getenv("IDENTITY") == "MSI" {
			_azureCredential, err = azidentity.NewManagedIdentityCredential(nil)
		} else {
			_azureCredential, err = azidentity.NewDefaultAzureCredential(nil)
		}
		if err != nil {
			panic(err)
		}
	}
	return _azureCredential
}

func getAzureBlobClient() *azblob.Client {
	if _blobClient == nil {
		var err error
		url := "https://homeserverdata.blob.core.windows.net/"
		cred := GetAzureCredential()

		_blobClient, err = azblob.NewClient(url, cred, nil)
		if err != nil {
			panic(err)
		}
	}
	return _blobClient
}

type FileStorage interface {
	Read(path string) ([]byte, error)
	Write(path string, data []byte) error
}

type LocalFile struct{}

func (f LocalFile) Read(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func (f LocalFile) Write(path string, data []byte) error {
	return os.WriteFile(path, data, 0o600)
}

type AzureBlobFile struct{}

func (f AzureBlobFile) Read(path string) ([]byte, error) {
	container, file := getAzureBlobFilePath(path)

	// Download the blob
	ctx := context.Background()
	get, err := getAzureBlobClient().DownloadStream(ctx, container, file, nil)
	if err != nil {
		return nil, err
	}

	var downloadedData bytes.Buffer
	retryReader := get.NewRetryReader(ctx, &azblob.RetryReaderOptions{})
	defer retryReader.Close()

	_, err = downloadedData.ReadFrom(retryReader)
	return downloadedData.Bytes(), err
}

func (f AzureBlobFile) Write(path string, data []byte) error {
	container, file := getAzureBlobFilePath(path)
	_, err := getAzureBlobClient().UploadBuffer(context.Background(), container, file, data, &azblob.UploadBufferOptions{})
	return err
}

func getAzureBlobFilePath(path string) (string, string) {
	idx := strings.LastIndex(path, "/")
	return strings.ReplaceAll(path[:idx], "/", "-"), path[idx+1:]
}
