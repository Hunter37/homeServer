package swim

type Table struct {
	Header       []string   // table header
	Value        []int      // index of the text value in items
	Link         []int      // index of the link in items
	TrClass      *int       // index of the tr class in items
	Action       []string   // action of the link
	Items        [][]string // table data
	Additions    []*Element
	ShowOrder    bool
	LeftAlign    []bool
	FilterColumn int
	Age          int
	Title        string
	Next         *Table
}

type Element struct {
	Text   string
	Link   string
	Action string
}

type Birthday struct {
	Display string
	Right   string
}
