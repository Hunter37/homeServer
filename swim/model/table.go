package model

import (
	"context"
	"encoding/json"
	"fmt"
	"homeServer/storage"
	"strings"
	"sync"

	"github.com/Azure/azure-sdk-for-go/sdk/data/aztables"
)

type SwimmerEntity struct {
	aztables.Entity

	LSC     string
	Swimmer *Swimmer
}

const (
	swimmerTable = "swimmers1"
	toplistTable = "toplists"
)

var (
	tableClients     = map[string]*aztables.Client{}
	tableClientsLock = &sync.Mutex{}
)

type TableEntity[T any] struct {
	aztables.Entity

	Object *T
}

func GetTableObject[T any](table, pkey, rkey string) (*T, error) {
	client, err := getTableClient(table)
	if err != nil {
		return nil, err
	}

	entity, err := client.GetEntity(context.TODO(), pkey, rkey, nil)
	if err != nil {
		return nil, err
	}

	return tableEntityToObject[T](entity.Value)
}

func tableEntityToObject[T any](jsonString []byte) (*T, error) {
	var flatData map[string]any
	err := json.Unmarshal(jsonString, &flatData)
	if err != nil {
		return nil, err
	}

	tableEntity := TableEntity[T]{
		Entity: aztables.Entity{
			PartitionKey: flatData["PartitionKey"].(string),
			RowKey:       flatData["RowKey"].(string),
		},
	}

	count := int(flatData["_count_"].(float64))
	var blocks []string
	for i := 0; i < count; i++ {
		blockKey := fmt.Sprintf("_block_%d_", i)
		block := flatData[blockKey].(string)
		blocks = append(blocks, block)
	}
	jsonBytes := []byte(strings.Join(blocks, ""))

	err = json.Unmarshal(jsonBytes, &tableEntity.Object)
	return tableEntity.Object, err
}

func SaveTableObject[T any](table, pkey, rkey string, obj *T) error {
	jsonBytes, err := objectToTableEntity(pkey, rkey, obj)
	if err != nil {
		return err
	}

	client, err := getTableClient(table)
	if err != nil {
		return err
	}

	_, err = client.UpsertEntity(context.TODO(), jsonBytes, nil)

	return err
}

func objectToTableEntity[T any](pkey, rkey string, obj *T) ([]byte, error) {
	jsonBytes, err := json.Marshal(obj)
	if err != nil {
		return nil, err
	}

	tableEntity := map[string]any{
		"PartitionKey": pkey,
		"RowKey":       rkey,
	}

	var blocks []string
	const maxBlockSize = 32 * 1024
	for len(jsonBytes) > 0 {
		blockSize := len(jsonBytes)
		if blockSize > maxBlockSize {
			blockSize = maxBlockSize
		}
		block := string(jsonBytes[:blockSize])
		blocks = append(blocks, block)
		jsonBytes = jsonBytes[blockSize:]
	}
	tableEntity["_count_"] = len(blocks)

	for i, block := range blocks {
		tableEntity[fmt.Sprintf("_block_%d_", i)] = block
	}

	return json.Marshal(tableEntity)
}

func DeleteTableObjecty(table, pkey, rkey string) error {
	client, err := getTableClient(table)
	if err != nil {
		return err
	}

	_, err = client.DeleteEntity(context.TODO(), pkey, rkey, nil)

	return err
}

func getTableClient(tableName string) (*aztables.Client, error) {
	tableClientsLock.Lock()
	defer tableClientsLock.Unlock()
	cred := storage.GetAzureCredential()

	client, found := tableClients[tableName]
	if !found {
		accountName := "homeserverdata"
		var err error

		serviceURL := fmt.Sprintf("https://%s.table.core.windows.net/%s", accountName, tableName)
		client, err = aztables.NewClient(serviceURL, cred, nil)
		if err != nil {
			return nil, err
		}

		tableClients[tableName] = client
	}

	return client, nil
}

/*
func ReadSwimmer1Data() {
	now := time.Now()
	LoadSwimmerTable()
	fmt.Println("ReadSwimmer1Data:", time.Since(now))

	fmt.Println(len(_swimmerCache))
}


func DataMigrationToTable1() {
	var recovered Data
	now := time.Now()
	err := recover("./backup/data-2024-02-27.gob.gzip", &recovered)
	if err != nil {
		panic(err)

	}

	fmt.Printf("recover from gob gzip: %v\n", time.Since(now))

	swimmers := recovered.Swimmers

	count := 0
	for lscId, Lsc := range swimmers {
		lscId = strings.Replace(lscId, "/", "|", -1)

		for sid, swimmer := range Lsc.Swimmers {
			if swimmer.ID != sid {
				fmt.Errorf("expected id: %s, got: %s\n", sid, swimmer.ID)
			}
			swimmer.LSC = Lsc.LSC
			swimmer.LscID = lscId

			err := SaveTableObject[Swimmer](SwimmerTable, lscId, sid, swimmer)
			if err != nil {
				panic(err)
			}
			count++
			if count%10 == 0 {
				fmt.Print(".")
			}
		}
	}

	fmt.Printf("\n%v save to table: %v\n", count, time.Since(now))
}
//*/
