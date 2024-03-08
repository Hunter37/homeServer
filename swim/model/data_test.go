package model

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"compress/lzw"
	"compress/zlib"
	"fmt"
	"io"
	"testing"
	"time"

	"homeServer/test"
)

/*
func gobMarshal(v any) ([]byte, error) {
	var gobBuffer bytes.Buffer
	gobEnc := gob.NewEncoder(&gobBuffer)

	if err := gobEnc.Encode(v); err != nil {
		return nil, err
	} else {
		return gobBuffer.Bytes(), nil
	}
}

func TestRecoverData(t *testing.T) {
	var recovered Data
	err := recover(`C:\Users\xueweihan.REDMOND\Downloads\data-2024-02-27.gob.gzip`, &recovered)
	test.NoError(t, err)
	str, err := json.Marshal(recovered)
	test.NoError(t, err)
	err = storage.File.Write("recovered.json", str)
	test.NoError(t, err)
}

func TestSerializeAndDeserialize(t *testing.T) {
	var data Data
	var recovered Data

	_, filename, _, _ := runtime.Caller(0)
	t.Logf("Current test filename: %s", filename)
	dir := filepath.Dir(filename)

	// now := time.Now()
	// err := load(filepath.Join(dir,"../../data/data.json"), &data)
	// test.NoError(t, err)
	// fmt.Println("Load json file:       ", time.Since(now))

	now := time.Now()
	err := backup(filepath.Join(dir, "../../bin/data.gob.gzip"), &data)
	test.NoError(t, err)
	fmt.Println("backup to gob gzip:   ", time.Since(now))

	now = time.Now()
	err = recover(filepath.Join(dir, "../../bin/data.gob.gzip"), &recovered)
	test.NoError(t, err)
	fmt.Println("recover from gob gzip:", time.Since(now))

	test.True(t, reflect.DeepEqual(data, recovered))

	func() {
		// json
		now := time.Now()
		jsonData, err := json.Marshal(data)
		test.NoError(t, err)

		fmt.Printf("Json Size:    %8d   Runtime:    %12v\n", len(jsonData), time.Since(now))

		lzwTest(t, jsonData)
		deflateTest(t, jsonData)
		zlibTest(t, jsonData)
		gzipTest(t, jsonData)
	}()

	fmt.Println()

	func() {
		// gob
		now := time.Now()
		gobData, err := gobMarshal(data)
		test.NoError(t, err)

		fmt.Printf("Gob Size:     %8d   Runtime:    %12v\n", len(gobData), time.Since(now))

		lzwTest(t, gobData)
		deflateTest(t, gobData)
		zlibTest(t, gobData)
		gzipTest(t, gobData)
	}()
}
//*/

func compressTest(t *testing.T, byteData []byte, name string,
	cmpWriter func(writer io.Writer) (io.WriteCloser, error),
	dcmpReader func(reader io.Reader) (io.ReadCloser, error)) {

	var buf bytes.Buffer
	writer, err := cmpWriter(&buf)
	test.NoError(t, err)

	now := time.Now()
	count, err := writer.Write(byteData)
	test.NoError(t, err)
	writer.Close()
	cmpTime := time.Since(now)

	test.Equal(t, count, len(byteData))

	cmpData := buf.Bytes()

	var decBuf bytes.Buffer
	decBuf.Write(cmpData)
	reader, err := dcmpReader(&decBuf)
	test.NoError(t, err)

	now = time.Now()
	newData, err := io.ReadAll(reader)
	test.NoError(t, err)
	reader.Close()
	decTime := time.Since(now)

	test.True(t, bytes.Equal(newData, byteData))

	fmt.Printf("%s %8d   EncodeTime: %12v   DecodeTime: %12v\n", name, len(cmpData), cmpTime, decTime)
}

func gzipTest(t *testing.T, byteData []byte) {
	compressTest(t, byteData, "Gzip Size:   ",
		func(writer io.Writer) (io.WriteCloser, error) {
			return gzip.NewWriterLevel(writer, gzip.BestCompression)
		},
		func(reader io.Reader) (io.ReadCloser, error) {
			return gzip.NewReader(reader)
		})
}

func deflateTest(t *testing.T, byteData []byte) {
	compressTest(t, byteData, "Deflate Size:",
		func(writer io.Writer) (io.WriteCloser, error) {
			return flate.NewWriter(writer, flate.BestCompression)
		},
		func(reader io.Reader) (io.ReadCloser, error) {
			return flate.NewReader(reader), nil
		})
}

func zlibTest(t *testing.T, byteData []byte) {
	compressTest(t, byteData, "Zlib Size:   ",
		func(writer io.Writer) (io.WriteCloser, error) {
			return zlib.NewWriterLevel(writer, zlib.BestCompression)
		},
		func(reader io.Reader) (io.ReadCloser, error) {
			return zlib.NewReader(reader)
		})
}

func lzwTest(t *testing.T, byteData []byte) {
	compressTest(t, byteData, "Lzw Size:    ",
		func(writer io.Writer) (io.WriteCloser, error) {
			return lzw.NewWriter(writer, lzw.LSB, 8), nil
		},
		func(reader io.Reader) (io.ReadCloser, error) {
			return lzw.NewReader(reader, lzw.LSB, 8), nil
		})
}
