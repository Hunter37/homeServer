package utils

import (
	"bytes"
	"fmt"
	"reflect"
	"testing"
)

// NoError asserts that a function returned no error (i.e. `nil`).
//
//	  actualObj, err := SomeFunction()
//	  if assert.NoError(t, err) {
//		   assert.Equal(t, expectedObj, actualObj)
//	  }
func NoError(t *testing.T, err error, msgAndArgs ...interface{}) bool {
	if err != nil {
		return Fail(t, fmt.Sprintf("Received unexpected error:\n%+v", err), msgAndArgs...)
	}

	return true
}

// Fail reports a failure through
func Fail(t *testing.T, failureMessage string, msgAndArgs ...any) bool {
	t.Errorf("\n%s %s", failureMessage, fmt.Sprint(msgAndArgs...))
	return false
}

// True asserts that the specified value is true.
//
//	assert.True(t, myBool)
func True(t *testing.T, value bool, msgAndArgs ...interface{}) bool {
	if !value {
		return Fail(t, "Should be true", msgAndArgs...)
	}

	return true
}

// Equal asserts that two objects are equal.
//
//	assert.Equal(t, 123, 123)
//
// Pointer variable equality is determined based on the equality of the
// referenced values (as opposed to the memory addresses). Function equality
// cannot be determined and will always fail.
func Equal[T any](t *testing.T, expected, actual T, msgAndArgs ...any) bool {
	if err := validateEqualArgs(expected, actual); err != nil {
		return Fail(t, fmt.Sprintf("Invalid operation: %#v == %#v (%s)",
			expected, actual, err), msgAndArgs...)
	}

	if !objectsAreEqual(expected, actual) {

		return Fail(t, fmt.Sprintf("Not equal: \n"+
			"expected: %v\n"+
			"actual  : %v", expected, actual), msgAndArgs...)
	}

	return true
}

func NotEqual(t *testing.T, expected, actual interface{}, msgAndArgs ...interface{}) bool {
	if err := validateEqualArgs(expected, actual); err != nil {
		return Fail(t, fmt.Sprintf("Invalid operation: %#v != %#v (%s)",
			expected, actual, err), msgAndArgs...)
	}

	if objectsAreEqual(expected, actual) {
		return Fail(t, fmt.Sprintf("Should not be: %#v\n", actual), msgAndArgs...)
	}

	return true
}

// ObjectsAreEqual determines if two objects are considered equal.
//
// This function does no assertion of any kind.
func objectsAreEqual(expected, actual any) bool {
	if expected == nil || actual == nil {
		return expected == actual
	}

	exp, ok := expected.([]byte)
	if !ok {
		return reflect.DeepEqual(expected, actual)
	}

	act, ok := actual.([]byte)
	if !ok {
		return false
	}
	if exp == nil || act == nil {
		return exp == nil && act == nil
	}
	return bytes.Equal(exp, act)
}

// validateEqualArgs checks whether provided arguments can be safely used in the
// Equal/NotEqual functions.
func validateEqualArgs(expected, actual any) error {
	if expected == nil && actual == nil {
		return nil
	}

	if isFunction(expected) || isFunction(actual) {
		return fmt.Errorf("cannot take func type as argument")
	}
	return nil
}

func isFunction(arg any) bool {
	if arg == nil {
		return false
	}
	return reflect.TypeOf(arg).Kind() == reflect.Func
}
