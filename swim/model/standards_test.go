package model

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"compress/lzw"
	"compress/zlib"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"io"
	"testing"
	"time"

	"homeServer/test"
	"homeServer/utils"
)

func TestBuildMotivateTimes(t *testing.T) {
	// gender | age | course | stroke | length [AAAA, AAA, AA, A, BB, B]
	standards := getMotivationalTimes("../../2021-2024AgeGroupMotivationTimes.txt")

	utils.Log(fmt.Sprint(len(standards)))
}

func TestLoadAgeGroupStandards(t *testing.T) {
	loadAgeGroupStandards("../../ageGroupTimeStandards.json")

	test.Equal(t, meetStandards["ShowD"]["Female15SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female16SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female17SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female18SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female14SCYFree50"], 2929)
	test.Equal(t, meetStandards["ShowD"]["Female15LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female16LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female17LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female18LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female14LCMFree50"], 3319)
}

func TestForNilSlice(t *testing.T) {
	var nilSlice []string
	for _, s := range nilSlice {
		fmt.Println(s)
	}
}

func gobMarshal(v any) ([]byte, error) {
	var gobBuffer bytes.Buffer
	gobEnc := gob.NewEncoder(&gobBuffer)

	if err := gobEnc.Encode(v); err != nil {
		return nil, err
	} else {
		return gobBuffer.Bytes(), nil
	}
}

func TestSerializeAndDeserialize(t *testing.T) {

	var data Data
	err := load("../../data.json", &data)
	test.NoError(t, err)

	err = backup("../../data.gob.gzip", &data)
	test.NoError(t, err)

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

//func TestDateMigration(t *testing.T) {
//	by, _ := os.ReadFile("../../ageGroupTimeStandards.json")
//	lines := strings.Split(string(by), "\n")
//	result := ""
//	for _, line := range lines {
//		parts := strings.Split(line, " ")
//		if len(parts) == 8 {
//			result += fmt.Sprintf("%s %s %s %s %s %s %s %s\n", parts[2], parts[1], parts[0], parts[3], parts[4], parts[5], parts[6], parts[7])
//		} else {
//			result += line + "\n"
//		}
//	}
//	os.WriteFile("../../ageGroupTimeStandards1.json", []byte(result), 0o600)
//}
