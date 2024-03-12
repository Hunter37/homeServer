package swim

import (
	"encoding/json"
	"reflect"
	"testing"
)

type Job interface {
	Do() string
}

type BaseJob struct {
	Url string
}

type TestJob struct {
	BaseJob
	Name string
}

func (job TestJob) Do() string {
	return job.Name
}

type ColorJob struct {
	BaseJob
	Color string
}

func (job ColorJob) Do() string {
	return job.Color
}

func MarshalJSON(obj Job) ([]byte, error) {
	container := &struct {
		Type  string `json:"type"`
		Value Job    `json:"value"`
	}{
		Type:  reflect.TypeOf(obj).Name(),
		Value: obj,
	}

	return json.Marshal(container)
}

func UnmarshalJSON(b []byte, types []reflect.Type) (Job, error) {
	var s struct {
		Type  string          `json:"type"`
		Value json.RawMessage `json:"value"`
	}

	json.Unmarshal(b, &s)

	for _, t := range types {
		if t.Name() == s.Type {
			obj := reflect.New(t).Interface().(Job)
			json.Unmarshal(s.Value, obj)
			return obj, nil
		}
	}
	return nil, nil
}

func TestUnmarshalJSON(t *testing.T) {

	types := []reflect.Type{
		reflect.TypeOf(TestJob{}),
		reflect.TypeOf(ColorJob{}),
	}

	tests := []struct {
		name  string
		input Job
	}{
		{
			name:  "testJob test",
			input: TestJob{BaseJob: BaseJob{Url: "http://www.google.com"}, Name: "test"},
		},
		{
			name:  "colorJob test",
			input: ColorJob{BaseJob: BaseJob{Url: "http://www.google.com"}, Color: "red"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			b, err := MarshalJSON(tt.input)
			if err != nil {
				t.Fatal(err)
			}

			got, err := UnmarshalJSON(b, types)
			if err != nil {
				t.Fatal(err)
			}

			if got.Do() != tt.input.Do() {
				t.Errorf("UnmarshalJSON() = %v, input %v", got, tt.input)
			}
			// if !reflect.DeepEqual(got, tt.input) {
			// 	t.Errorf("UnmarshalJSON1() = %v, input %v", got, tt.input)
			// }
		})
	}
}
