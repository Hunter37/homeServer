package model

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"sync"
	"time"

	"homeServer/utils"
)

var (
	_swimmerCache      = map[string]*Swimmer{}
	_swimmerCacheLock  = &sync.RWMutex{}
	_swimmerCacheReady = false
)

func IsSwimmerCacheReady() bool {
	return _swimmerCacheReady
}

func GetSwimmerFormCache(fullID string) *Swimmer {
	var swimmer *Swimmer

	utils.ReadLockOperation(_swimmerCacheLock, func() {
		s := _swimmerCache[fullID]
		if s != nil {
			tmp := utils.Clone(*s)
			swimmer = &tmp
		}
	})

	if swimmer == nil && !_swimmerCacheReady {
		parts := strings.Split(fullID, ":")
		if len(parts) == 2 {
			var err error
			swimmer, err = GetTableObject[Swimmer](swimmerTable, parts[0], parts[1])
			if err != nil {
				utils.LogError(err)
			}
		}
	}

	return swimmer
}

func GetSwimmerFormCacheByName(name string) []*Swimmer {
	var swimmers []*Swimmer

	if !_swimmerCacheReady {
		return swimmers
	}

	name = strings.ToLower(strings.TrimSpace(name))
	matchName := func(recordName string) bool {
		recordName = strings.ToLower(recordName)
		parts := strings.Split(recordName, " ")
		parts = append(parts, recordName)
		for _, part := range parts {
			if strings.Index(part, name) == 0 {
				return true
			}
		}
		return false
	}

	utils.ReadLockOperation(_swimmerCacheLock, func() {
		for _, s := range _swimmerCache {
			if matchName(s.Alias) || matchName(s.Name) {
				swimmers = append(swimmers, s)
			}
		}
	})

	return swimmers
}

func WriteSwimmerToCache(swimmer *Swimmer) error {
	fullId := swimmer.LscID + ":" + swimmer.ID

	newSwimmer := utils.Clone(*swimmer)
	oldSwimmer := GetSwimmerFormCache(fullId)

	if oldSwimmer != nil {
		newSwimmer.Update = time.Now()
		oldSwimmer.Update = newSwimmer.Update

		if reflect.DeepEqual(newSwimmer, oldSwimmer) {
			return nil
		}
	}

	utils.WriteLockOperation(_swimmerCacheLock, func() {
		_swimmerCache[fullId] = &newSwimmer
	})

	return SaveTableObject[Swimmer](swimmerTable, swimmer.LscID, swimmer.ID, &newSwimmer)
}

func RemoveSwimmerFromCache(fullId string) error {

	var swimmer *Swimmer
	utils.WriteLockOperation(_swimmerCacheLock, func() {
		swimmer = _swimmerCache[fullId]
		delete(_swimmerCache, fullId)
	})

	if swimmer == nil {
		return fmt.Errorf("cannot found swimmer '%s'", fullId)
	}

	return DeleteTableObjecty(swimmerTable, swimmer.LscID, swimmer.ID)
}

func LoadSwimmerCacheFromTable() error {
	client, err := getTableClient(swimmerTable)
	if err != nil {
		return err
	}

	ctx := context.TODO()

	pager := client.NewListEntitiesPager(nil)

	for pager.More() {
		resp, err := pager.NextPage(ctx)
		if err != nil {
			return err
		}

		fmt.Printf("loading cache data %d\n", len(resp.Entities))

		for _, entity := range resp.Entities {
			swimmer, err := tableEntityToObject[Swimmer](entity)
			if err != nil {
				utils.LogError(err)
				continue
			}

			utils.WriteLockOperation(_swimmerCacheLock, func() {
				_swimmerCache[swimmer.LscID+":"+swimmer.ID] = swimmer
			})
		}
	}

	utils.Logf("%s swimmer cache loaded %v\n", utils.GetLogTime(), len(_swimmerCache))

	_swimmerCacheReady = true
	return nil
}
