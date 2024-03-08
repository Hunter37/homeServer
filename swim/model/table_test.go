package model

import (
	"fmt"
	"reflect"
	"testing"

	"homeServer/test"
)

type testObj struct {
	Name string
	Age  int
	Big  map[string]string
	Obj  *testObj
}

func TestObjectToTableEntity(t *testing.T) {
	obj := testObj{
		Name: "John",
		Age:  30,
		Big:  map[string]string{},
		Obj: &testObj{
			Name: "Mike",
			Age:  40,
			Obj: &testObj{
				Name: "Tom",
				Age:  50,
			},
		},
	}

	for i := 0; i < 10000; i++ {
		obj.Big[fmt.Sprintf("key%d", i)] = fmt.Sprintf("value%d", i)
	}

	entity, err := objectToTableEntity("pkey", "rkey", &obj)
	test.NoError(t, err)

	newObj, err := tableEntityToObject[testObj](entity)
	test.NoError(t, err)

	if !reflect.DeepEqual(obj, *newObj) {
		t.Errorf("expected entity: %v, got: %v", obj, *newObj)
	}
}

/*
type testEntity struct {
	aztables.Entity

	Name string
	Age  int
	Big  map[string]string
}

func TestFlatAndUnFlatTableEntity(t *testing.T) {

	entity := testEntity{
		Entity: aztables.Entity{
			PartitionKey: "pk",
			RowKey:       "rk",
		},
		Name: "John",
		Age:  30,
		Big:  map[string]string{},
	}

	for i := 0; i < 1000; i++ {
		entity.Big[fmt.Sprintf("key%d", i)] = fmt.Sprintf("value%d", i)
	}

	bytes, err := flatTableEntity(&entity, "Big")
	test.NoError(t, err)

	var unflatEntity testEntity
	err = unflatTableEntity(bytes, "Big", &unflatEntity)
	test.NoError(t, err)

	if !reflect.DeepEqual(entity, unflatEntity) {
		t.Errorf("expected entity: %v, got: %v", entity, unflatEntity)
	}
}

func TestFlatAndUnFlatSwimmerEntity(t *testing.T) {

	entity := &SwimmerEntity{
		Entity: aztables.Entity{
			PartitionKey: "pk",
			RowKey:       "rk",
		},
		LSC: "lsc",
		Swimmer: &Swimmer{
			Name: "John",
			Age:  30,
		},
	}

	bytes, err := flatEntity(entity)
	test.NoError(t, err)

	unflatEntity, err := unflatEntity(bytes)
	test.NoError(t, err)

	if !reflect.DeepEqual(entity, unflatEntity) {
		t.Errorf("expected entity: %v, got: %v", entity, unflatEntity)
	}
}

//*/
