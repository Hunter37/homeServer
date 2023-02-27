package swim

type Table struct {
	Header         []string   `json:",omitempty"` // table header
	Value          []int      `json:",omitempty"` // index of the text value in items
	Link           []int      `json:",omitempty"` // index of the link in items
	TrClass        *int       `json:",omitempty"` // index of the tr class in items
	Action         []string   `json:",omitempty"` // action of the link
	Items          [][]any    `json:",omitempty"` // table data
	Additions      []*Element `json:",omitempty"`
	ShowOrder      bool       `json:",omitempty"`
	LeftAlign      []bool     `json:",omitempty"`
	FilterColumn   int        `json:",omitempty"`
	StandardColumn int        `json:",omitempty"`
	Standards      []Standard `json:",omitempty"`
	Age            int        `json:",omitempty"`
	Title          string     `json:",omitempty"`
	Next           *Table     `json:",omitempty"`
}

type Element struct {
	Text   string `json:",omitempty"`
	Link   string `json:",omitempty"`
	Action string `json:",omitempty"`
	Log    string `json:",omitempty"`
}

type Birthday struct {
	Display string `json:",omitempty"`
	Right   string `json:",omitempty"`
}

type Standard struct {
	Name string `json:",omitempty"`
	Time string `json:",omitempty"`
}
