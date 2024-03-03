package model

import (
	"context"
	"encoding/json"
	"fmt"
	"homeServer/storage"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/data/aztables"
)

type SwmimerEntity struct {
	aztables.Entity

	LSC     string
	Swimmer *Swimmer
}

var tableClient *aztables.Client

func getTableClient() (*aztables.Client, error) {
	if tableClient == nil {
		tableName := "swimmers"
		accountName := "homeserverdata"
		var err error

		serviceURL := fmt.Sprintf("https://%s.table.core.windows.net/%s", accountName, tableName)
		tableClient, err = aztables.NewClient(serviceURL, storage.AzureCredential, nil)
		if err != nil {
			return nil, err
		}
	}

	return tableClient, nil
}

func flatEntity(entity *SwmimerEntity) ([]byte, error) {
	data := make(map[string]any)
	data["PartitionKey"] = entity.PartitionKey
	data["RowKey"] = entity.RowKey
	data["LSC"] = entity.LSC

	swimmerBytes, err := json.Marshal(entity.Swimmer)
	if err != nil {
		return nil, err
	}

	var blocks []string
	const maxBlockSize = 32 * 1024
	for len(swimmerBytes) > 0 {
		blockSize := len(swimmerBytes)
		if blockSize > maxBlockSize {
			blockSize = maxBlockSize
		}
		block := string(swimmerBytes[:blockSize])
		blocks = append(blocks, block)
		swimmerBytes = swimmerBytes[blockSize:]
	}
	data["Count"] = len(blocks)

	for i, block := range blocks {
		data[fmt.Sprintf("Block%d", i)] = block
	}

	return json.Marshal(data)
}

func unflatEntity(data []byte) (*SwmimerEntity, error) {
	var flatData map[string]any
	err := json.Unmarshal(data, &flatData)
	if err != nil {
		return nil, err
	}

	entity := &SwmimerEntity{
		Entity: aztables.Entity{
			PartitionKey: flatData["PartitionKey"].(string),
			RowKey:       flatData["RowKey"].(string),
		},
		LSC: flatData["LSC"].(string),
	}

	count := int(flatData["Count"].(float64))
	var blocks []string
	for i := 0; i < count; i++ {
		blockKey := fmt.Sprintf("Block%d", i)
		block := flatData[blockKey].(string)
		blocks = append(blocks, block)
	}

	swimmerBytes := []byte(strings.Join(blocks, ""))
	err = json.Unmarshal(swimmerBytes, &entity.Swimmer)
	if err != nil {
		return nil, err
	}

	return entity, nil
}

func loadSwimmersTable() (*Swimmers, error) {
	client, err := getTableClient()
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	swimmers := Swimmers{}

	pager := client.NewListEntitiesPager(nil)

	for pager.More() {
		resp, err := pager.NextPage(ctx)
		if err != nil {
			return nil, err
		}

		fmt.Println(len(resp.Entities))

		for _, entity := range resp.Entities {
			swimmerEntity, err := unflatEntity(entity)
			if err != nil {
				return nil, err
			}

			lscId := strings.Replace(swimmerEntity.PartitionKey, "|", "/", -1)
			lsc, ok := swimmers[lscId]
			if !ok {
				lsc = &Lsc{
					LSC:      swimmerEntity.LSC,
					Swimmers: map[string]*Swimmer{},
				}
				swimmers[lscId] = lsc
			}

			lsc.Swimmers[swimmerEntity.RowKey] = swimmerEntity.Swimmer
		}
	}

	return &swimmers, nil
}

func saveSwimmersTable(swimmers *Swimmers) error {
	client, err := getTableClient()
	if err != nil {
		return err
	}

	ctx := context.TODO()
	const maxBatchSize = 64
	for lscString, lsc := range *swimmers {
		pkey := strings.Replace(lscString, "/", "|", -1)

		batch := make([]aztables.TransactionAction, 0, maxBatchSize)
		for _, swimmer := range lsc.Swimmers {

			swmimerEntity := &SwmimerEntity{
				Entity: aztables.Entity{
					PartitionKey: pkey,
					RowKey:       swimmer.ID,
				},
				LSC:     lsc.LSC,
				Swimmer: swimmer,
			}

			entity, err := flatEntity(swmimerEntity)
			if err != nil {
				return err
			}

			batch = append(batch, aztables.TransactionAction{
				ActionType: aztables.TransactionTypeInsertReplace,
				Entity:     entity,
			})

			if len(batch) >= maxBatchSize {
				resp, err := client.SubmitTransaction(ctx, batch, nil)
				if err != nil {
					return err
				}
				fmt.Println(len(batch), resp)
				batch = make([]aztables.TransactionAction, 0, maxBatchSize)
			}
		}

		if len(batch) > 0 {
			resp, err := client.SubmitTransaction(ctx, batch, nil)
			if err != nil {
				return err
			}
			fmt.Println(len(batch), resp)
		}
	}

	return nil
}

/*
func saveTableEntry(lsc string, swimmer *Swimmer) error {

	lsc = strings.Replace(lsc, "/", "|", -1)

	entity := &SwmimerEntity{
		Entity: aztables.Entity{
			PartitionKey: lsc,
			RowKey:       swimmer.ID,
		},
		Swimmer: swimmer,
	}

	item, err := flatEntity(entity)
	if err != nil {
		return err
	}

	client, err := getTableClient()
	if err != nil {
		return err
	}

	_, err = client.UpsertEntity(context.TODO(), item, nil)
	return err
}

func getTableEntry(lsc, id string) (*Swimmer, error) {
	fixed := strings.Replace(lsc, "/", "|", -1)

	client, err := getTableClient()
	if err != nil {
		return nil, err
	}

	entity, err := client.GetEntity(context.TODO(), fixed, id, nil)
	if err != nil {
		return nil, err
	}

	swimmerEntity, err := unflatEntity(entity.Value)
	if err != nil {
		return nil, err
	}

	return swimmerEntity.Swimmer, nil
}

func TableDataMigrationSave() {
	var data Data
	var file = storage.LocalFile{}
	b, err := file.Read("bin/data.json")
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(b, &data)
	if err != nil {
		panic(err)
	}
	text := getInfo(&data)
	fmt.Println(text)

	err = saveSwimmersTable(&data.Swimmers)
	if err != nil {
		panic(err)
	}

}

func TableDataMigrationLoad() {
	var data Data
	err := load("bin/data.json", &data)
	if err != nil {
		panic(err)
	}
	fmt.Println(getInfo(&data))
}

func TableDataMigrationSingleSave() {

	var data Data
	var file = storage.LocalFile{}
	b, err := file.Read("../../bin/data.json")
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(b, &data)
	if err != nil {
		panic(err)
	}
	text := getInfo(&data)
	fmt.Println(text)

	count := 0
	for lscstring, lsc := range data.Swimmers {
		for _, swimmer := range lsc.Swimmers {
			// LSC:     lsc.LSC,
			// Swimmer: sid,
			err := saveTableEntry(lscstring, swimmer)
			if err != nil {
				panic(err)
			}

			count++

			_, err = getTableEntry(lscstring, swimmer.ID)
			if err != nil {
				panic(err)
			}

			//test.Equal(t, newSwimmer, swimmer)
		}
	}

	fmt.Print(count)
}
*/
