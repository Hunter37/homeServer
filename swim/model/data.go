package model

import (
	"bytes"
	"compress/gzip"
	"encoding/gob"

	"homeServer/storage"
)

type Lsc struct {
	LSC      string              `json:",omitempty"`
	Swimmers map[string]*Swimmer `json:",omitempty"`
}

type Swimmers map[string]*Lsc

type Data struct {
	Swimmers Swimmers `json:",omitempty"`
	TopLists TopLists `json:",omitempty"`
	Settings Settings `json:",omitempty"`
}

func recover(path string, data *Data) error {
	b, err := storage.File.Read(path)
	if err != nil {
		return err
	}

	gzipReader, err := gzip.NewReader(bytes.NewBuffer(b))
	if err != nil {
		return err
	}

	gobDec := gob.NewDecoder(gzipReader)
	err = gobDec.Decode(data)
	if err != nil {
		return err
	}

	return gzipReader.Close()
}

/*
var mainData = Data{}

var mutex = sync.RWMutex{}

func Save() {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	var jsonStr []byte
	var err error
	saveSwimersToJson := true

	if os.Getenv("STORAGE") == "AZURE_BLOB" {
		saveSwimmersTable(&data.Swimmers)
		saveSwimersToJson = false
	}

	func() {
		if !saveSwimersToJson {
			swimmers := data.Swimmers
			defer func() { data.Swimmers = swimmers }()
			data.Swimmers = nil
		}
		jsonStr, err = json.Marshal(data)
	}()

	if err == nil {
		err = storage.File.Write(dataFile, jsonStr)
	}

	if err != nil {
		utils.LogError(err, "Main data save failed!")
	} else {
		utils.Log(utils.GetLogTime() + " Main data saved!\n")
	}
}

func Backup(path string) error {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	return backup(path, data)
}

func backup(path string, data *Data) error {
	var buf bytes.Buffer

	gzipWriter, err := gzip.NewWriterLevel(&buf, gzip.BestCompression)
	if err != nil {
		return err
	}

	gobEnc := gob.NewEncoder(gzipWriter)
	err = gobEnc.Encode(data)
	if err != nil {
		return err
	}

	err = gzipWriter.Close()
	if err != nil {
		return err
	}

	return storage.File.Write(path, buf.Bytes())
}

// Delete remove the swimmer by id
func Delete(sid string) {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	for _, lsc := range data.Swimmers {
		if _, ok := lsc.Swimmers[sid]; ok {
			delete(lsc.Swimmers, sid)
			break
		}
	}
}

// AddSwimmer create the swimmer basic info

func AddSwimmer(lscId, lscName, sid, name, gender, team string, age int) {
	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	dlsc, ok := data.Swimmers[lscId]
	if !ok {
		dlsc = &Lsc{LSC: lscName, Swimmers: map[string]*Swimmer{}}
		data.Swimmers[lscId] = dlsc
	}

	swimmer, ok := dlsc.Swimmers[sid]
	if !ok {
		swimmer = &Swimmer{}
	}

	if swimmer.LCM == nil {
		swimmer.LCM = Stroke{}
	}
	if swimmer.SCY == nil {
		swimmer.SCY = Stroke{}
	}

	dlsc.Swimmers[sid] = swimmer
	swimmer.ID = sid
	swimmer.Name = name
	swimmer.Gender = gender
	swimmer.Team = strings.TrimSpace(team)
	swimmer.Age = age
	swimmer.Update = time.Now()

	return swimmer
}

func UpdateSwimmer(sid string, swimmer *Swimmer) {
	swimmer = utils.Clone(swimmer)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	for _, lsc := range data.Swimmers {
		if _, ok := lsc.Swimmers[sid]; ok {
			lsc.Swimmers[sid] = swimmer
			break
		}
	}
}

func findSwimmer(sid string, data *Data) *Swimmer {
	var swimmer *Swimmer
	for _, lsc := range data.Swimmers {
		if s, ok := lsc.Swimmers[sid]; ok {
			swimmer = s
			break
		}
	}
	return swimmer
}

func DataMigration() {
	for _, lsc := range mainData.Swimmers {
		var bad []string
		for sid, swimmer := range lsc.Swimmers {
			if swimmer.Age == 0 {
				bad = append(bad, sid)
			}
		}
		for _, sid := range bad {
			delete(lsc.Swimmers, sid)
			utils.Log("Deleted " + sid + "\n")
		}
	}

	var bad []string
	for path, lsc := range mainData.Swimmers {
		if len(lsc.Swimmers) == 0 {
			bad = append(bad, path)
		}
	}

	for _, path := range bad {
		delete(mainData.Swimmers, path)
		utils.Log("Deleted " + path + "\n")
	}
}

func Init() {
	mainData = Data{
		Swimmers: make(Swimmers),
		Settings: Settings{
			CacheTimeInMinutes: 360,
		},
	}
}

//*/
