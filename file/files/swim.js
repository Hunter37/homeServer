Date.prototype.toDateInputValue = (function () {
    let local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
});

///////////////////////////////////////////////////////////////////////////////////////////////
// shared const

const _courseOrder = ['SCY', 'SCM', 'LCM'];
const _strokeOrder = ['FR', 'BK', 'BR', 'FL', 'IM'];
const _storkeMap = {
    'FR': 'Free',
    'BK': 'Back',
    'BR': 'Breast',
    'FL': 'Fly',
    'IM': 'IM'
};
const _meetShortNames = {
    "Futures (LCM)": "FU",
    "Winter Juniors (SCY)": "WJ",
    "Summer Juniors (LCM)": "SJ",
    "Winter US Open (SCY)": "WO",
    "Winter US Open (LCM)": "WO",
    "Summer US Open": "SO",
    "Winter Nationals (LCM)": "WN",
    "Summer Nationals (LCM)": "SN",
    "Olympic Trials": "OT",
    "Olympic Trials Wave I": "OT1",
    "Olympic Trials Wave II": "OT2",
};
const _1DayInSec = 24 * 60 * 60;
const _1WeekInSec = 7 * _1DayInSec;
const _10YearsInSec = 10 * 365 * _1DayInSec;

const _1DayInMilliSeconds = _1DayInSec * 1000;


//   1            2             3            4             5               6              7          8          9         10
const _eventList = ['0 _ _',
    '50 FR SCY', '100 FR SCY', '200 FR SCY', '500 FR SCY', '1000 FR SCY', '1650 FR SCY', '_ _ _', '_ _ _', '_ _ _', '_ _ _',
    '50 BK SCY', '100 BK SCY', '200 BK SCY', '50 BR SCY', '100 BR SCY', '200 BR SCY', '50 FL SCY', '100 FL SCY', '200 FL SCY', '100 IM SCY',
    '200 IM SCY', '400 IM SCY', '23 _ _', '24 _ _', '25 _ _', '26 _ _', '27 _ _', '50 FR SCM', '100 FR SCM', '200 FR SCM',
    '400 FR SCM', '800 FR SCM', '1500 FR SCM', '34 _ _', '35 _ _', '36 _ _', '37 _ _', '50 BK SCM', '100 BK SCM', '200 BK SCM',
    '50 BR SCM', '100 BR SCM', '200 BR SCM', '50 FL SCM', '100 FL SCM', '200 FL SCM', '100 IM SCM', '200 IM SCM', '400 IM SCM', '50 _ _',
    '51 _ _', '52 _ _', '53 _ _', '54 _ _', '50 FR LCM', '100 FR LCM', '200 FR LCM', '400 FR LCM', '800 FR LCM', '1500 FR LCM',
    '61 _ _', '62 _ _', '63 _ _', '64 _ _', '50 BK LCM', '100 BK LCM', '200 BK LCM', '50 BR LCM', '100 BR LCM', '200 BR LCM',
    '50 FL LCM', '100 FL LCM', '200 FL LCM', '200 IM LCM', '400 IM LCM', '76 _ _', '77 _ _', '78 _ _', '79 _ _', '80 _ _', '25 FR SCY',
    '25 BK SCY', '25 BR SCY', '25 FL SCY', '25 FR SCM', '25 BK SCM', '25 BR SCM', '25 FL SCM', '89 _ _', '90 _ _', '91 _ _'];
const _eventIndexMap = new Map();
_eventList.forEach((item, index) => {
    _eventIndexMap.set(item, index);
});

///////////////////////////////////////////////////////////////////////////////////////////////
// page utility functions

function getEventCourse(event) {
    return _eventList[event].split(' ')[2];
}

function min(a, b) {
    return a < b ? a : b;
}

function max(a, b) {
    return a > b ? a : b;
}


function formatDate(date) {
    return date.substring(5, 7) + '/' + date.substring(8, 10) + '/' + date.substring(2, 4);
}

function formatStandard(standard, short) {
    if (standard == '"Slower than B"') {
        return '';
    }

    if (standard.startsWith('"')) {
        return standard.substring(1, standard.length - 1);
    }

    if (short) {
        let parts = standard.split(' ');
        if (parseInt(parts[0]) > 1900) {
            parts.shift();
        }
        standard = parts.join(' ');
        if (_meetShortNames[standard]) {
            standard = _meetShortNames[standard];
        }
    }

    return standard
}

function formatDelta(delta) {
    if (delta === null) {
        return '';
    }
    delta /= 100;
    return (delta > 0 ? '+' : '') + (delta != null ? delta.toFixed(2) : '');
}

function getAgeKey(age) {
    age = Math.floor((age + 1) / 2) * 2;
    return age <= 10 ? '10U' : age > 18 ? '19O' : (age - 1) + '-' + age;
}

function convetToGenderString(gender) {
    return ['', 'Female', 'Male'][gender] || 'Unknown';
}

function convertToGenderCode(genderStr) {
    return genderStr == 'Male' ? 2 : 1;
}

///////////////////////////////////////////////////////////////////////////////////////////////
// local caches

class LocalCache {
    static currentVersion = 2;

    static set(key, value) {
        ldb.set(key, { time: new Date(), data: value, version: LocalCache.currentVersion });
    }

    static async get(key, timeoutInSec, minVersion) {
        // todo: remove this, just for testing
        //return null;

        let item = await new Promise(resolve => ldb.get(key, r => resolve(r)));

        if (!item || (item.version || 0) < (minVersion || 0)) {
            return;
        }

        timeoutInSec = timeoutInSec || _1DayInSec;
        if (new Date() - new Date(item.time) > timeoutInSec * 1000) {
            return;
        }

        return item.data;
    }

    static async func(key, func, timeoutInSec, minVersion) {
        let data = await LocalCache.get(key, timeoutInSec, minVersion);
        if (data) {
            return data;
        }

        try {
            data = await func();
        } catch (e) {
            // try to use old data if network is down
            data = await LocalCache.get(key, _10YearsInSec, minVersion);
            console.error(e, key);
            if (!data) {
                throw e;
            }
            console.log('Using old data for', key);
            return data;
        }

        if (!data) {
            return;
        }

        LocalCache.set(key, data);
        return data;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
// club dictionary

class ClubDictinary {
    #dict;
    constructor() {
        this.#dict = new Map();
    }

    static async #load(lsc) {
        return await LocalCache.func('clubs/' + lsc, async () => {
            let bodyObj = {
                metadata: [
                    {
                        title: 'clubName',
                        dim: "[OrgUnit.Level4Name]",
                        datatype: "text"
                    },
                    {
                        title: 'club',
                        dim: "[OrgUnit.Level4Code]",
                        datatype: "text",
                    },
                    {
                        dim: "[OrgUnit.Level3Code]",
                        datatype: "text",
                        filter: {
                            equals: lsc,
                        },
                        panel: "scope"
                    }
                ],
                count: 5000
            };

            return await fetchSwimValues(bodyObj, 'event');
        }, _1WeekInSec, 2);
    }

    async loadClubMap(lsc) {
        let map = this.#dict.get(lsc);
        if (!map) {

            let data = await ClubDictinary.#load(lsc);
            if (data) {
                map = new Map(data);

                this.#dict.set(lsc, map);
            }
        }

        return map;
    }

    async loadClubCode(lsc, clubName) {
        let map = await this.loadClubMap(lsc);
        if (!map) {
            return;
        }

        return map.get(clubName);
    }
}

let _clubDictinary = new ClubDictinary();

///////////////////////////////////////////////////////////////////////////////////////////////
// meet dictionary

class MeetDictionary {
    #dict;
    constructor() {
        this.#dict = new Map();
        this.#dict.idx = { date: 0, name: 1 };
    }

    static async #load(meets) {
        let bodyObj = {
            metadata: [
                {
                    title: 'meet',
                    dim: "[UsasSwimTime.MeetKey]",
                    datatype: "numeric",
                    filter: {
                        members: [...meets]
                    }
                },
                {
                    title: 'date',
                    dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                    datatype: "datetime",
                    level: "days",
                    sort: "asc"
                },
                {
                    title: 'meetName',
                    dim: "[Meet.MeetName]",
                    datatype: "text"
                }
            ],
            count: meets.size * 5
        };

        let data = await fetchSwimValues(bodyObj, 'event');
        if (!data) {
            return;
        }
        let idx = data.idx;

        // only keep the first meet date as meet start date
        let result = [];
        for (let row of data) {
            let meet = row[idx.meet];
            if (meets.has(meet)) {
                meets.delete(meet);

                row[idx.date] = row[idx.date].substring(0, 10);
                result.push(row);
            }
        }
        result.idx = idx;

        return result;
    }

    static async #loadCached(meets) {
        let result = [];
        for (let meet of meets) {
            let key = 'meet/' + meet;
            let data = await LocalCache.get(key, _10YearsInSec);
            if (data) {
                let [date, meetName] = data;
                result.push([meet, date, meetName]);
                meets.delete(meet);
            }
        }

        if (meets.size == 0) {
            return result;
        }

        let data = await MeetDictionary.#load(meets);
        if (data) {
            let idx = data.idx;
            for (let row of data) {
                let meet = row[idx.meet];
                let date = row[idx.date];
                let meetName = row[idx.meetName];
                result.push([meet, date, meetName]);
                LocalCache.set('meet/' + meet, [date, meetName]);
            }
        }

        return result;
    }

    async loadMeets(meets) {
        let meetsToLoad = new Set();
        for (let meet of meets) {
            if (!this.#dict.has(meet)) {
                meetsToLoad.add(meet);
            }
        }

        let data = await MeetDictionary.#loadCached(meetsToLoad);
        if (data) {
            for (let [meet, date, meetName] of data) {
                this.#dict.set(meet, [date, meetName]);
            }
        }

        return this.#dict;
    }
}

let _meetDictinary = new MeetDictionary();

///////////////////////////////////////////////////////////////////////////////////////////////
// birthday dictionary

class BirthdayDictionary {
    #dict;
    constructor() {
        this.#dict = new Map();
    }

    async load(pkey) {
        let data = this.#dict.get(pkey);
        if (data) {
            return data;
        }

        data = await LocalCache.get('bday/' + pkey, _10YearsInSec);
        if (data) {
            this.#dict.set(pkey, data);
            return data;
        }
    }

    calculate(pkey, events, meetDict, age) {
        // time, age, std, lsc, club, date, event, meet, gender
        // 0     1    2    3    4     5     6      7     8
        let now = new Date();
        let nowYear = now.getUTCFullYear();
        let nowMonth = now.getUTCMonth();
        let nowDate = now.getUTCDate();
        let left = new Date(Date.UTC(1900, 0, 1));
        let right = new Date(Date.UTC(nowYear, nowMonth, nowDate));
        if (age) {
            right.setUTCFullYear(nowYear - age, nowMonth, nowDate);
            left.setUTCFullYear(nowYear - age - 1, nowMonth, nowDate + 1);
        }

        for (let row of events) {
            let meet = row[events.idx.meet];
            let meetDate = meetDict.get(meet)[meetDict.idx.date];
            let meetAge = row[events.idx.age];
            let d = new Date(meetDate);
            d.setUTCFullYear(d.getUTCFullYear() - meetAge, d.getUTCMonth(), d.getUTCDate());
            right = min(d, right);
            d = new Date(meetDate);
            d.setUTCFullYear(d.getUTCFullYear() - meetAge - 1, d.getUTCMonth(), d.getUTCDate() + 1);
            left = max(d, left);
        }

        left = left.toJSON().substring(0, 10);
        right = right.toJSON().substring(0, 10);

        if (left > right) {
            console.error('Invalid birthday:' + pkey + '  [' + left + ' - ' + right + ']');
            right = left;
        }

        let range = [left, right];
        LocalCache.set('bday/' + pkey, range);
        this.#dict.set(pkey, range);

        return range;
    }

    static format(range) {
        if (!range) {
            return '';
        }

        let html = [];

        let [left, right] = range;
        left = left.replace(/-0/g, '-').replace(/-/g, '/');
        right = right.replace(/-0/g, '-').replace(/-/g, '/');

        html.push(left);
        if (left != right) {
            html.push(' - ');
            if (left.substring(0, 4) == right.substring(0, 4)) {
                right = right.substring(5);
            }
            html.push(right);
        }
        return html.join('');
    }
}
let _birthdayDictionary = new BirthdayDictionary();

///////////////////////////////////////////////////////////////////////////////////////////////
// usa swimming data fetch utility functions

async function fetchSwimValues(bodyObj, type) {
    let map = {
        swimmer: 'https://usaswimming.sisense.com/api/datasources/Public Person Search/jaql',
        event: 'https://usaswimming.sisense.com/api/datasources/USA Swimming Times Elasticube/jaql',
        meet: 'https://usaswimming.sisense.com/api/datasources/Meets/jaql',
    }

    let url = map[type || 'swimmer'];

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjY0YmE2NmE5M2ZiYTUwMDM4NWIyMWQwIiwiYXBpU2VjcmV0IjoiNDQ0YTE3NWQtM2I1OC03NDhhLTVlMGEtYTVhZDE2MmRmODJlIiwiYWxsb3dlZFRlbmFudHMiOlsiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIl0sInRlbmFudElkIjoiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIn0.izSIvaD2udKTs3QRngla1Aw23kZVyoq7Xh23AbPUw1M'
        },
        signal: AbortSignal.timeout(7000),
        body: JSON.stringify(bodyObj)
    });

    if (!response.ok) {
        return;
    }

    let data = await response.json();
    if (data.error || !data.values) {
        return;
    }

    let idx = {};
    for (let i = 0; i < data.headers.length; ++i) {
        idx[data.headers[i]] = i;
    }
    data.values.idx = idx;

    return data.values;
}

///////////////////////////////////////////////////////////////////////////////////////////////
// navigation and routing functions

function go(action, value) {
    window.location.hash = '#' + action + '/' + encodeURIComponent(value);
}

function updateContent(html) {
    if (_loadingHash == window.location.hash.substring(1)) {
        document.getElementById('content').innerHTML = html;
    }
}

window.addEventListener('hashchange', loadContent);
window.addEventListener('load', loadContent);

let _loadingHash;
async function loadContent() {
    _backgroundActions.length = 0;

    _loadingHash = window.location.hash.substring(1);
    if (!_loadingHash) {
        updateContent(`Please enter the swimmer's name or the club name in the search box.`, true);
        return;
    }

    updateContent('Loading....');

    let [action, value] = _loadingHash.split('/');
    value = decodeURIComponent(value);

    let func = window[action];
    if (func) {
        try {
            await func(value);
        } catch (e) {
            updateContent(e);
        }
    } else {
        window.location.replace('');
    }
}

const _backgroundActions = [];
async function backgroundRunner() {
    while (true) {
        if (_backgroundActions.length > 0) {
            let [action, value] = _backgroundActions.shift();
            try {
                await action(value);
            } catch (e) {
                console.error(e, value);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
for (let i = 0; i < 1; i++) {
    backgroundRunner().catch(console.error);
}

///////////////////////////////////////////////////////////////////////////////////////////////
// tab view

class TabView {
    #id;
    #tabs;
    #views;
    constructor(id) {
        this.#id = id;
        this.#tabs = [];
        this.#views = [];
    }

    addTab(name, view) {
        this.#tabs.push(name);
        this.#views.push(view);
    }

    render() {
        let html = [];

        html.push(`<div class="tabview" id="${this.#id}">`);

        html.push('<div class="tabs">');
        for (let i = 0; i < this.#tabs.length; ++i) {
            html.push(`<div class="tab${i == 0 ? ' selected' : ''}" onclick="TabView.tab('${this.#id}', ${i})">${this.#tabs[i]}</div>`);
        }
        html.push('</div>');

        for (let i = 0; i < this.#views.length; ++i) {
            html.push(`<div class="view ${i == 0 ? '' : 'hide'}">${this.#views[i]}</div>`);
        }

        html.push('</div>');

        return html.join('');
    }

    static tab(id, index) {
        let tabs = document.querySelectorAll(`#${id}>.tabs>.tab`);
        for (let i = 0; i < tabs.length; ++i) {
            tabs[i].classList.toggle('selected', i == index);
        }
        let views = document.querySelectorAll(`#${id}>.view`);
        for (let i = 0; i < views.length; ++i) {
            views[i].classList.toggle('hide', i != index);
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
// settings page

async function settings(params) {
    let tabView = new TabView('settingsTabView');

    tabView.addTab('<p>General</p>', '<div class="row"><input id="cache-key" /><button onclick="clearCache()">Clear App Cache</button><button onclick="clearCache(this)">Show Cache</button></div><div id="cache-info"></div>');
    tabView.addTab('<p>Advanced</p>', buildAdvancedSettings());
    tabView.addTab('<p>About</p>', '--about--');

    updateContent(tabView.render());
}

async function clearCache(elem) {
    if (!elem) {
        let key = document.getElementById('cache-key').value;
        let list = await new Promise(resolve => ldb.list(resolve));
        if (key.startsWith('!')) {
            key = key.substring(1);
            for (let k of list) {
                if (!k.startsWith(key)) {
                    await new Promise(resolve => ldb.delete(k, resolve));
                }
            }
            alert('Cache key not started with ' + key + ' is cleared.');
        } else {
            for (let k of list) {
                if (k.startsWith(key)) {
                    await new Promise(resolve => ldb.delete(k, resolve));
                }
            }
            alert('Cache key started with ' + key + ' is cleared.');
        }
    }

    let list = await new Promise(resolve => ldb.list(resolve));
    let text = '';
    for (let k of list) {
        text += k + '\n';
    }
    document.getElementById('cache-info').innerText = text;
    //window.location.reload();
}


function buildAdvancedSettings() {


    let dropDown = new Dropdown('testid',
        '<div style="background-color:blue;">hello</div>',
        '<div style="background-color:red;">world</div>');

    let select = new Select('my-select', [['', null], ['one', 1], ['group1'], ['two', 2], ['four', 4], ['five', 5], ['group2'], ['eight', 8], ['group1'], ['two', 2], ['four', 4], ['five', 5], ['group2'], ['eight', 8], ['group1'], ['two', 2], ['four', 4], ['five', 5], ['group2'], ['eight', 8]], 4, (value) => {
        console.log(value);
    });

    return '<div style="padding:100px;background-color:red">' + dropDown.render() + select.render() + '</div>';
}

class Dropdown {
    #id;
    #triggerElem;
    #content;
    static #dropdowns = new Map();
    static get(id) {
        return Dropdown.#dropdowns.get(id);
    }

    constructor(id, triggerElem, content) {
        this.#id = id;
        this.#triggerElem = triggerElem;
        this.#content = content;
        this.onopen = null;

        Dropdown.#dropdowns.set(id, this);
    }

    render() {
        return `<table id="${this.#id}" class="fill drop-layout"><tbody><tr><td onclick="Dropdown.get('${this.#id}').click()">${this.#triggerElem}</td></tr>`
            + `<tr><td style="position:relative"><div><div class="dropdown hide">${this.#content}</div></div></td></tr></tbody></table>`;
    }

    click() {
        if (document.querySelector(`#${this.#id} .dropdown`).classList.contains('hide')) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        document.querySelector(`#${this.#id} .dropdown`).classList.remove('hide');
        let closing = (e) => {
            if (!e.target.closest(`#${this.#id}`)) {
                this.close();
                window.removeEventListener('click', closing);
                window.removeEventListener('touchstart', closing);
            }
        }

        window.addEventListener('click', closing);
        window.addEventListener('touchstart', closing);
        this.onopen && this.onopen();
    }

    close() {
        document.querySelector(`#${this.#id} .dropdown`).classList.add('hide');
    }
}

class Select {
    #id;
    #values;
    #selected;
    #onchange;
    #dropdown;
    static #selects = new Map();
    static get(id) {
        return Select.#selects.get(id);
    }

    constructor(id, values, selected, onchange) {
        this.#id = id;
        this.#values = values;
        this.#selected = selected;
        this.#onchange = onchange;
        this.style = '';
        this.class = '';
        this.valueEqualtoSelection = (a, b) => a === b;

        Select.#selects.set(id, this);
    }

    select(value) {
        // clean list selection
        let root = document.getElementById(this.#id);

        for (let i = 0; i < this.#values.length; ++i) {
            let elem = root.querySelector('.o' + i);
            elem.classList.remove('selected');
        }

        // change selection & highlight selected item
        this.#selected = value;
        let text = '';
        for (let [i, [txt, val]] of this.#values.entries()) {
            if (val === undefined) {
                continue;
            }
            // we can have more than one selected highlight item
            if (this.valueEqualtoSelection(value, val)) {
                root.querySelector('.o' + i).classList.add('selected');
            }
            // but only one real selected value and text
            if (val === value) {
                text = txt;
            }
        }

        // set the text
        document.getElementById(this.#id + '-text').innerText = text;
        this.#dropdown.close();
        this.#onchange(value);
    }

    onclickItem(index) {
        this.select(this.#values[index][1]);
    }

    #renderCustom() {
        let cls = this.class ? ` ${this.class}` : '';
        let style = this.style ? ` style="${this.style}"` : '';
        let text = '';
        for (let value of this.#values) {
            if (value.length == 1) {
                value.push(undefined);
            }
            if (value[1] === this.#selected) {
                text = value[0];
            }
        }
        let elem = `<div class='select-text${cls}'><span id="${this.#id}-text"${style}>${text}</span><span class="arrow">▽</span></div>`;

        let options = [`<div id="${this.#id}">`];
        let ending = '';
        for (let [i, [txt, val]] of this.#values.entries()) {
            if (val === undefined) {
                options.push(ending);
                options.push(`<div class="group"><div onclick="event.stopPropagation()" class="o${i} group-txt">${txt}</div>`);
                ending = '</div>';
            } else {
                let selected = this.valueEqualtoSelection(this.#selected, val) ? ' selected' : '';
                options.push(`<div onclick="Select.get('${this.#id}').onclickItem(${i})" class="o${i} option${selected}${cls}">${txt || '&nbsp;'}</div>`);
            }
        }
        options.push(ending, '</div>');

        this.#dropdown = new Dropdown(this.#id, elem, options.join(''));
        this.#dropdown.onopen = () => {
            let root = document.getElementById(this.#id);
            let index = this.#values.findIndex(v => v[1] === this.#selected);
            let elem = root.querySelector('.o' + index);
            elem.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
        }
        return this.#dropdown.render();
    }

    render(custom) {
        if (custom) {
            return this.#renderCustom();
        }

        let html = [];
        let cls = this.class ? ` class="${this.class}"` : '';
        let ending = '';
        html.push(`<select${cls} onchange="Select.get('${this.#id}').onselect(this.value)">`);
        for (let [txt, val] of this.#values) {
            if (val === undefined) {
                html.push(ending);
                html.push(`<optgroup label="${txt}">`);
                ending = '</optgroup>';
            } else {
                let selectedCls = this.valueEqualtoSelection(this.#selected, val) ? ' class="selected"' : '';
                let selected = val === this.#selected ? ' selected' : '';
                html.push(`<option value="${val}"${selectedCls}${selected}>${txt}</option>`);
            }
        }

        html.push(`${ending}</select>`);
        return html.join('');
    }

    onselect(value) {
        this.#onchange(value);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
// search functions

const _inputElem = document.getElementById('input');
_inputElem.addEventListener('keypress', (event) => {
    if (event.key == 'Enter') {
        onSearch();
    }
});

async function onSearch() {
    go('search', _inputElem.value);
}

async function onSearchAll() {
    go('searchAll', _inputElem.value);
}

async function search(name, all) {
    if (!name) {
        window.location.replace('');
        return;
    }

    let values = await loadSearch(name, all);

    showSearch(values);
}

async function searchAll(params) {
    return await search(params, true);
}

async function loadSearch(name, all) {
    let key = 'search/' + name + (all ? '<ALL>' : '');
    return await LocalCache.func(key, async () => {
        let values = await loadSwimmerSearch(name, all);
        if (!values || values.length == 0) {
            values = await loadClubSearch(name, all);
        }

        if (!values || values.length <= 1) {
            return values;
        }

        values = await filterSwimmers(values);
        if (values) {
            values.sort((a, b) => a[values.idx.age] - b[values.idx.age]);
        }
        return values;
    });
}

async function filterSwimmers(values) {
    let pkeys = new Set(values.map(v => v[values.idx.pkey]));

    let bodyObj = {
        metadata: [
            {
                title: 'pkey',
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: [...pkeys]
                }
            }
        ],
        count: pkeys.size
    }

    let list = await fetchSwimValues(bodyObj, 'event');
    if (!list) {
        return;
    }

    pkeys = new Set(list.map(v => v[list.idx.pkey]));
    let result = [];
    let idx = values.idx;
    result.idx = idx;
    for (let row of values) {
        if (pkeys.has(row[idx.pkey])) {
            result.push(row);
        }
    }

    return result;
}

function showSearch(values) {
    if (values.length == 0) {
        updateContent('No result found');
        return;
    }

    if (values.length == 1) {
        // replace will remove the current entry from the browser history
        window.location.replace('#swimmer/' + encodeURIComponent(values[0][values.idx.pkey]));
        return;
    }

    let html = [];
    // name, age, club, lsc, pkey

    html.push('<table class="fill top-margin" id="search-table"><tbody><tr class="th"><th></th><th>Name</th><th>Age</th><th>Club</th><th>LSC</th></tr>');
    let index = 0;
    for (let [name, age, club, lsc, pkey] of values) {
        html.push(`<tr onclick="go('swimmer', ${pkey})"><td>`, ++index, '</td><td class="left">', name,
            '</td><td>', age, '</td><td class="left">', club, '</td><td>', lsc, '</td></tr>');
    }
    html.push('</tbody></table>');

    updateContent(html.join(''));
}

async function loadClubSearch(value, all) {
    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[Persons.FullName]",
                datatype: "text"
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                sort: "asc"
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
                filter: {
                    contains: value
                }
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text"
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric"
            }
        ],
        count: 5000
    };

    if (!all) {
        bodyObj.metadata[1].filter = {
            to: 18
        }
    } else {
        bodyObj.metadata[1].filter = {
            from: 19
        }
    }

    return await fetchSwimValues(bodyObj);
}

async function loadSwimmerSearch(value, all) {
    let names = splitNameBySpaces(value);
    let calls = [];
    for (let [firstName, lastName] of names) {
        calls.push(loadSwimmerSearchByFirstAndLastName(firstName, lastName, all));
    }

    let values = [];
    let data = await Promise.all(calls);
    let set = new Set();
    for (let vs of data) {
        for (let v of vs) {
            let pkey = v[vs.idx.pkey];
            if (!set.has(pkey)) {
                values.push(v);
                set.add(pkey);
            }
        }
        values.idx = vs.idx;
    }

    return values;
}

function splitNameBySpaces(input) {
    const result = [];
    const words = input.split(' ');

    for (let i = 0; i <= words.length; i++) {
        const firstPart = words.slice(0, i).join(' ');
        const secondPart = words.slice(i).join(' ');
        result.push([firstPart, secondPart]);
    }

    return result;
}

async function loadSwimmerSearchByFirstAndLastName(firstName, lastName, all) {
    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[Persons.FullName]",
                datatype: "text"
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                sort: "asc"
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text"
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text"
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric"
            },
            {
                dim: "[Persons.LastName]",
                filter: {
                    startsWith: lastName
                },
                panel: "scope"
            },
            {
                dim: "[Persons.FirstAndPreferredName]",
                filter: {
                    contains: firstName
                },
                panel: "scope"
            }
        ],
        count: 5000
    };

    if (!all) {
        bodyObj.metadata[1].filter = {
            to: 18
        }
    } else {
        bodyObj.metadata[1].filter = {
            from: 19
        }
    }

    return await fetchSwimValues(bodyObj);
}

///////////////////////////////////////////////////////////////////////////////////////////////
// swimmer functions

async function swimmer(pkey) {
    if (!pkey || pkey === 'undefined') {
        window.location.replace('');
        return;
    }
    let data = await loadDetails(Number(pkey));
    await showDetails(data);
}

async function loadDetails(pkey) {
    let data = await LocalCache.func('swimmer/' + pkey, async () => {
        let swimmerCall = loadSwimerInfo(pkey);
        let eventsCall = loadEvents(pkey);

        let [swimmerInfo, events] = await Promise.all([swimmerCall, eventsCall]);
        if (!swimmerInfo || !events) {
            updateContent('Cannot get data for ' + pkey);
            return;
        }

        // swimmer
        // firstName, lastName, age, clubName, lsc, pkey, club, zone
        // 0          1         2    3         4    5     6     7
        // events
        // time, age, std, lsc, club, date, event, meet, gender
        // 0     1    2    3    4     5     6      7     8

        return {
            events: events,
            swimmer: swimmerInfo
        };
    }, null, 2);

    if (data) {
        return await postLoadDetails(data);
    }
}

async function postLoadDetails(data) {
    let idx = data.events.idx;
    let meets = new Set(data.events.map(e => e[idx.meet]));
    data.meetDict = await _meetDictinary.loadMeets(meets);

    data.swimmer.birthday = _birthdayDictionary.calculate(data.swimmer.pkey, data.events, data.meetDict, data.swimmer.age);
    data.swimmer.alias = getAlias(data.swimmer.firstName, data.swimmer.lastName);
    data.swimmer.gender = data.events.length > 0 ? data.events[0][data.events.idx.gender] : '';

    return data;
}

async function loadEvents(pkey) {
    let bodyObj = {
        metadata: [
            {
                title: "time",
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text"
            },
            {
                title: "age",
                dim: "[UsasSwimTime.AgeAtMeetKey]",
                datatype: "numeric"
            },
            {
                title: "std",
                dim: "[TimeStandard.TimeStandardName]",
                datatype: "text"
            },
            {
                title: "lsc",
                dim: "[OrgUnit.Level3Code]",
                datatype: "text"
            },
            {
                title: "clubName",
                dim: "[OrgUnit.Level4Name]",
                datatype: "text"
            },
            {
                title: "date",
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days",
                sort: "asc"
            },
            {
                title: "event",
                dim: "[UsasSwimTime.SwimEventKey]",
                datatype: "numeric"
            },
            {
                title: "meet",
                dim: "[UsasSwimTime.MeetKey]",
                datatype: "numeric"
            },
            {
                title: 'gender',
                dim: "[UsasSwimTime.EventCompetitionCategoryKey]",
                datatype: "numeric",
            },
            {
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
                filter: {
                    equals: pkey
                },
                panel: "scope",
            }
        ],
        count: 5000
    };

    let events = await fetchSwimValues(bodyObj, 'event');
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    if (!events) {
        return;
    }

    let idx = events.idx;
    for (let row of events) {
        row[idx.date] = row[idx.date].substring(0, 10);
    }

    events.sort((a, b) => a[idx.date] == b[idx.date] ? timeToInt(b[idx.time]) - timeToInt(a[idx.time]) : a[idx.date] < b[idx.date] ? -1 : 1);

    return events;
}

async function loadSwimerInfo(pkey) {
    let bodyObj = {
        metadata: [
            {
                title: "firstName",
                dim: "[Persons.FirstAndPreferredName]",
                datatype: "text"
            },
            {
                title: "lastName",
                dim: "[Persons.LastName]",
                datatype: "text"
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric"
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text"
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
                filter: {
                    equals: pkey
                }
            }
        ],
        count: 1
    };

    let values = await fetchSwimValues(bodyObj);
    if (!values) {
        return;
    }

    let row = values[0];
    let swimmer = {
        firstName: row[values.idx.firstName],
        lastName: row[values.idx.lastName],
        age: row[values.idx.age],
        clubName: row[values.idx.clubName],
        lsc: row[values.idx.lsc],
        pkey: row[values.idx.pkey]
    };

    let club = await _clubDictinary.loadClubCode(swimmer.lsc, swimmer.clubName);
    if (!club) {
        return;
    }
    let zone = getLSCZone(swimmer.lsc);

    swimmer.club = club;
    swimmer.zone = zone;

    return swimmer;
}

async function showDetails(data) {
    // events
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    // meets
    // meet, meetName, date
    // 0     1         2

    if (!data) {
        updateContent('No swimmer found');
        return;
    }

    let html = [];

    // build title
    html.push(createDetailsPageTitle(data));
    if (data.events.length == 0) {
        html.push('<div>No events found</div>');
        updateContent(html.join(''));
        return;
    }

    let idx = data.events.idx;
    let hide25 = localStorage.getItem('hide25');
    if (hide25) {
        //data.events = data.events.filter(e => !_eventList[e[idx.event]].startsWith('25'));
        data.events = data.events.filter(e => e[idx.event] < 80);
        data.events.idx = idx;
    }

    let fastRowList = getFastRowByEvent(data.events);
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    // build the row info for first two tables
    let rowInfo = new Array(fastRowList.length);
    let courseCounter = 0;
    let strokeCounter = 0;
    for (let i = fastRowList.length - 1; i >= 0; --i) {
        let info = [];
        rowInfo[i] = info;
        ++courseCounter;
        ++strokeCounter;

        let [d, s, c] = i == 0 ? ['', '', ''] : _eventList[fastRowList[i - 1][idx.event]].split(' ');
        let [_, stroke, course] = _eventList[fastRowList[i][idx.event]].split(' ');

        if (course != c) {
            info.push(strokeCounter, courseCounter);
            courseCounter = strokeCounter = 0;
        } else if (stroke != s) {
            info.push(strokeCounter);
            strokeCounter = 0;
        }
    }

    let tabView = new TabView('swimmerTabView');
    tabView.addTab('<p>Personal Best</p>', await createBestTimeTable(data, fastRowList, rowInfo));
    tabView.addTab('<p>Age Best</p>', await createAgeBestTimeTable(data, fastRowList, rowInfo));
    tabView.addTab('<p>Meets</p>', createMeetTable(data));
    tabView.addTab(createClickableDiv('Progress Graph', `showGraph(null,{pkey:${data.swimmer.pkey}})`), createProgressGraph(data.swimmer.pkey, data.events));
    // tabView.addTab('<p>Ranking</p>', await createRankingTable(data, fastRowList, rowInfo));
    html.push(tabView.render());

    html.push(addHide25Botton());

    updateContent(html.join(''));
}

function getAlias(firstName, lastName) {
    let alias = firstName;
    if (alias[alias.length - 1] != ' ') {
        if (alias.toLowerCase().endsWith(lastName.toLowerCase())) {
            alias = alias.substring(0, alias.length - lastName.length);
        }

        let parts = alias.trim().split(' ');
        alias = parts.pop();
    } else {
        alias = alias.substring(0, alias.length - 1);
    }

    return alias;
}

function createDetailsPageTitle(data) {
    // swimmer
    // firstName, lastName, age, clubName, lsc, pkey, club, zone
    // 0          1         2    3         4    5     6     7
    // events
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    // meets
    // meetKey, startDate, meetName
    // 0        1          2

    let html = [];

    console.log(data.swimmer);

    html.push('<div class="match-size header"><span>', data.swimmer.alias, ' ', data.swimmer.lastName, '</span><span>',
        convetToGenderString(data.swimmer.gender), '</span><span>', data.swimmer.age, '</span><span>', data.swimmer.clubName, '</span><span>Birthday: ',
        BirthdayDictionary.format(data.swimmer.birthday), '</span><span>Total Event: ', data.events.length, '</span></div>');

    return html.join('');
}

function addHide25Botton() {
    let hide25 = localStorage.getItem('hide25');
    return ['<div style="height:20px;margin:5px"><button onclick="toggle25()" style="position:absolute;right:0">', hide25 ? 'Show 25 Events' : 'Hide 25 Events', '</button></div>'].join('');
}

function toggle25() {
    let hide25 = localStorage.getItem('hide25');
    if (hide25) {
        localStorage.removeItem('hide25');
    } else {
        localStorage.setItem('hide25', '1');
    }
    loadContent();
}

function getFastRowByEvent(events) {
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    // find the fast time for each event
    let fastRowMap = new Map();
    for (let row of events) {
        let eventKey = row[events.idx.event];
        let fastRow = fastRowMap.get(eventKey);
        if (!fastRow || timeToInt(row[events.idx.time]) <= timeToInt(fastRow[events.idx.time])) {
            fastRowMap.set(eventKey, row);
        }
    }

    // get unique event keys
    let uniqueEventKeys = [...fastRowMap.keys()];

    uniqueEventKeys.sort((a, b) => getEventSortKey(a) - getEventSortKey(b));

    // convert fastRow to a list ordered by the key of fastRow map
    let fastRowList = [];
    for (let key of uniqueEventKeys) {
        fastRowList.push(fastRowMap.get(key));
    }

    return fastRowList;
}

function getEventSortKey(event) {
    let [dist, stroke, course] = _eventList[event].split(' ');
    return _courseOrder.indexOf(course) * 100_000 + _strokeOrder.indexOf(stroke) * 10_000 + Number(dist);
}

function createPopup(text, popupText) {
    if (!text) {
        return '';
    }

    return ['<span class="bs">', text, '<div class="pop">', popupText, '</div></span>'].join('');
}

function createBestTimeTableHeader(data) {
    let stdName = ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA'];
    let meetStds = getMeetStandards(data.swimmer.age);

    let html = ['<tr class="wt"><th rowspan="2">Course</th><th rowspan="2">Stroke</th><th rowspan="2">Distance</th>',
        '<th rowspan="2">Best<br>Time</th><th rowspan="2">Event<br>Date</th><th rowspan="2">',
        createPopup('Event<br>Count', 'Total Event Count'), '</th><th class="rk" colspan="4">Rankings</th>'];

    if (data.swimmer.age < 19) {
        html.push(`<th colspan="${stdName.length}" class="mt">`,
            createPopup('Motivational Standards', 'USA Swimming 2024-2028 Motivational Standards'),
            '</th>');
    }

    html.push(`<th colspan="${meetStds.length}" class="mc">Meet Standards</th></tr>`,
        '<tr class="gy"><th class="rk">', createPopup(data.swimmer.club, data.swimmer.clubName), '</th><th class="rk">',
        createPopup(data.swimmer.lsc, getLSCName(data.swimmer.lsc)), '</th><th class="rk">',
        createPopup(data.swimmer.zone[0] + 'Z', data.swimmer.zone + ' Zone'), '</th><th class="rk">', createPopup('US', 'USA Swimming'), '</th>');

    if (data.swimmer.age < 19) {
        for (let std of stdName) {
            html.push('<th class="mt">', std, '</th>');
        }
    }

    for (let std of meetStds) {
        html.push('<th class="mc">', createPopup(std.short, std.meet), '</th>');
    }

    html.push('</tr>');
    return html.join('');
}

async function createBestTimeTable(data, fastRowList, rowInfo) {
    // swimmer
    // firstName, lastName, age, clubName, lsc, pkey, club, zone
    // 0          1         2    3         4    5     6     7
    // events
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    // meets
    // meetKey, meetName, startDate
    // 0        1         2

    // fastRowList
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    let idx = data.events.idx;
    let ageKey = getAgeKey(data.swimmer.age);
    let genderStr = convetToGenderString(data.swimmer.gender);
    let stdName = ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA'];
    let meetStds = getMeetStandards(data.swimmer.age);

    let html = ['<div class="content"><h2>Personal Best</h2>',
        '<div class="center-row">',
        '<style id="show-rk-style"></style>',
        createCheckbox('show-rk', 'show rankings', true, `document.getElementById('show-rk-style').innerText = this.checked ? '' : '.rk{display:none}'`)];

    if (data.swimmer.age < 19) {
        html.push('<style id="show-mt-style"></style>',
            createCheckbox('show-mt', 'motivation times', true, `document.getElementById('show-mt-style').innerText = this.checked ? '' : '.mt{display:none}'`))
    }

    html.push('<style id="show-mc-style"></style>',
        createCheckbox('show-mc', 'meet cuts', true, `document.getElementById('show-mc-style').innerText = this.checked ? '' : '.mc{display:none}'`),
        '</div>',
        '<table class="fill top-margin"><tbody>');

    // create the table header
    let header = createBestTimeTableHeader(data);
    html.push(header);

    // create the best time table body
    for (let i = 0; i < fastRowList.length; ++i) {
        let row = fastRowList[i];
        let time = row[idx.time];
        let date = row[idx.date];
        let event = row[idx.event];
        let timeInt = timeToInt(time);
        let eventStr = _eventList[event];
        let [dist, stroke, course] = eventStr.split(' ');

        if (rowInfo[i].length == 2 && i > 0) {
            html.push(header);
        }

        html.push(`<tr class="d${dist} ${stroke}">`);
        if (rowInfo[i].length == 2) {
            html.push(`<td class="age" rowspan="${rowInfo[i][1]}">${course}</td>`);
        }
        if (rowInfo[i].length > 0) {
            html.push(`<td class="bold" rowspan="${rowInfo[i][0]}">${_storkeMap[stroke]}</td>`);
        }

        // count the event for the swimmer
        let count = data.events.filter(r => r[data.events.idx.event] == event).length;

        html.push('<td class="full">', createClickableDiv(dist, `showGraph(null,{pkey:${data.swimmer.pkey},event:${event}})`), '</td><td>',
            time, '</td><td>', formatDate(date), '</td><td>', count, '</td>',
            await buildRankingCell(data.swimmer.pkey, timeInt, genderStr, event, ageKey, data.swimmer.zone, data.swimmer.lsc, data.swimmer.clubName),
            await buildRankingCell(data.swimmer.pkey, timeInt, genderStr, event, ageKey, data.swimmer.zone, data.swimmer.lsc),
            await buildRankingCell(data.swimmer.pkey, timeInt, genderStr, event, ageKey, data.swimmer.zone),
            await buildRankingCell(data.swimmer.pkey, timeInt, genderStr, event, ageKey));

        let stds = [];

        if (data.swimmer.age < 19) {
            let stdKey = `${genderStr} ${ageKey} ${eventStr}`;
            for (let std of stdName) {
                stds.push(getAgeGroupMotivationTime(`${stdKey} ${std}`));
            }
        }
        let motivationTimeCount = stds.length;
        for (let std of meetStds) {
            stds.push(std[genderStr].get(eventStr) || ['', 0]);
        }

        let preTime;
        for (let [i, [stdStr, stdInt]] of stds.entries()) {
            let css = i < motivationTimeCount ? 'mt' : 'mc';
            if (!stdInt) {
                html.push(`<td class="${css}"></td>`);
                continue;
            }
            preTime = (preTime && preTime >= stdInt ? preTime : 0) || stdInt * 1.15;
            let percent = Math.min(100, Math.max(0, (timeInt - stdInt) / (preTime - stdInt) * 100));
            percent = 100 - (percent < 5 && percent > 0 ? 5 : Math.floor(percent))
            let cls = timeInt <= stdInt ? 'dp' : 'ad';
            html.push(`<td class="${css} tc">`, buildTimeCell(stdStr, '', formatDelta(timeInt - stdInt), cls, percent), '</td>');
            preTime = stdInt;
        }

        html.push('</tr>');
    }

    html.push('</tbody></table></div>');

    return html.join('');
}

function createProgressGraph(pkey, events) {
    let html = [];
    let hide25 = localStorage.getItem('hide25');

    html.push('<div class="content">');

    html.push('<div class="match-size top-margin">');
    for (let i = 1; i < _eventList.length; ++i) {
        let [d, s, c] = _eventList[i].split(' ');
        if (c == 'SCY' && d != '_' && (d != '25' || !hide25)) {
            html.push(`<button class="d${d} ${s}" style="border:1px solid;width:45px;"`,
                ` onclick="showGraph(null,{pkey:${pkey},event:${i}})">${s}<br>${d}</button>`);
        }
    }
    html.push('</div>');

    html.push('<h2 id="graph-title"></h2>');

    let searchDropdown = new Dropdown('add-search',
        '<div class="center-row" onclick="event.stopPropagation()"><input id="add-input" onkeypress="addKeypress(this, event)"><button onclick="addSearch()">Search</button><button onclick="addSearch(null, true)">19&Over</button></div>',
        '<div id="adding-list" onclick="event.stopPropagation()"></div>');

    html.push('<div class="add-search"><div>Compare progress with other swimmers:</div>', searchDropdown.render(), '</div>');

    html.push('</div>');

    html.push('<div class="top-margin">');
    for (let c of _courseOrder) {
        html.push(createCheckbox('show-' + c.toLocaleLowerCase(), c, true, `showGraph(null,{${c}:this.checked})`));
    }
    html.push('<span style="display:inline-block"><span id="swimmer-list" class="center-row"></span></span></div>');

    html.push('<canvas id="canvas" class="hide" onmousemove="onCanvasMouseMove(this, event)" onwheel="wheelGraph(this, event)"></canvas>');

    html.push('<div style="position:relative;margin:0 50px"class="resize-panel">',
        '<button class="resize hide" style="left:40px;top:-190px" onclick="resizeY(-1)">⇧</button>',
        '<button class="resize hide" style="left:15px;top:-140px;transform:rotate(-90deg)" onclick="resizeX(-1)">⇧</button>',
        '<button class="resize hide" style="left:65px;top:-140px;transform:rotate(90deg)" onclick="resizeX(1)">⇧</button>',
        '<button class="resize hide" style="left:40px;top:-90px;transform:rotate(180deg)" onclick="resizeY(1)">⇧</button></div>',
        '<div class="tip"><span style="width:70px;display:inline-block;text-align:right;margin:0 8px">Mouse:</span>Ctrl⌘ + wheel to resize the date axis.  Shift + wheel to resize the time axis.<br>',
        '<span style="width:70px;display:inline-block;text-align:right;margin:0 8px">TouchPad:</span>Shift + two-finger up/down or left/right scroll to resize the date & time axis.</div>');

    html.push('<div class="top-margin">',
        createCheckbox('show-resize', 'show graph resize controls', false, `for(let e of document.getElementsByClassName('resize'))e.classList.toggle('hide')`),
        '</div>');

    return html.join('');
}

function createCheckbox(id, text, checked, onchange) {
    onchange = onchange ? ` onchange="${onchange}"` : '';
    checked = checked ? ' checked' : '';
    return '<span style="display:inline-block"><span class="checkbox-wrapper">' +
        `<input type="checkbox" id="${id}"${onchange}${checked}><label for="${id}">${text}</label></span></span>`;
}

// function isTouchDevice() {
//     return (('ontouchstart' in window) ||
//         (navigator.maxTouchPoints > 0) ||
//         (navigator.msMaxTouchPoints > 0));
// }

async function onCanvasMouseMove(canvas, e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();

    let offset = canvas.getBoundingClientRect();
    await showGraph(canvas, { mouseX: e.clientX - offset.left, mouseY: e.clientY - offset.top });
}

function updateGraphTitle(config) {
    let [dist, stroke, course] = _eventList[config.event].split(' ');

    const map = { 500: "400/500", 1000: "800/1000", 1650: "1500/1650" };
    document.getElementById('graph-title').innerText = `${map[dist] || dist} ${_storkeMap[stroke]}`;
}

async function wheelGraph(canvas, e) {
    e = e || window.event;

    if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            await resizeX(e.deltaX > 0 ? -1 : 1, canvas);
        } else {
            resizeY(e.deltaY > 0 ? -1 : 1, canvas);
        }

    } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        await resizeX(e.deltaY > 0 ? -1 : 1, canvas);

    }
}

async function resizeX(delta, canvas) {
    canvas = canvas || document.getElementById('canvas');

    let factor = canvas.config.xZoomFactor;
    factor += delta / 10;
    factor = Math.max(0.3, Math.min(20, factor));
    localStorage.setItem('xZoomFactor', factor.toFixed(2));
    await showGraph(canvas, { xZoomFactor: factor });
}

async function resizeY(delta, canvas) {
    canvas = canvas || document.getElementById('canvas');

    let factor = canvas.config.yZoomFactor;
    factor += delta / 10;
    factor = Math.max(0.3, Math.min(10, factor));
    localStorage.setItem('yZoomFactor', factor.toFixed(2));
    await showGraph(canvas, { yZoomFactor: factor });
}

//                  l-blue,  brown,  l-green p-blue  l-red   siyan   l-purple pink   l-yellow orange
const graphColors = ['#0AF', '#D85', '#0C4', '#88C', '#EBA', '#8CD', '#c9E', '#F9C', '#DD7', '#FC5'];

function prepareGraphData(config) {
    let [dist, stroke, course] = _eventList[config.event].split(' ');
    let idx = config.idx;

    let eventStrs = [];
    let values = [];
    let slowest = 0;
    let fastest = Infinity;
    let earliest = new Date();
    let latest = new Date(0);

    let baseBirthday;
    for (let swimmer of config.swimmerList) {
        if (swimmer.hide) {
            continue;
        }

        let [left, right] = swimmer.swimmer.birthday;
        let bday = new Date((new Date(right).getTime() + new Date(left).getTime()) / 2);
        if (!baseBirthday) {
            baseBirthday = bday;
        }
        let bdayOffset = config.ageAlign ? bday - baseBirthday : 0;

        for (let c of _courseOrder) {
            if (!config[c]) {
                continue;
            }
            let eventStr = fixDistance(`${dist} ${stroke} ${c}`);
            let evt = _eventIndexMap.get(eventStr);
            let value = swimmer.events.filter(e => e[idx.event] == evt);
            value.name = swimmer.swimmer.alias + ' ' + swimmer.swimmer.lastName;
            value.birthday = bday;
            value.bdayOffset = bdayOffset;

            for (let row of value) {
                let t = timeToInt(row[idx.time]);
                slowest = Math.max(slowest, t);
                fastest = Math.min(fastest, t);
                //earliest = min(earliest, new Date(row[idx.date]));
            }
            eventStrs.push(eventStr);
            values.push(value);
        }

        for (let row of swimmer.events) {
            let d = new Date(new Date(row[idx.date]) - bdayOffset);
            earliest = min(earliest, d);
            latest = max(latest, d);
        }
    }

    latest.setUTCMonth(latest.getUTCMonth() + 2);
    earliest.setUTCMonth(earliest.getUTCMonth() - 1);
    earliest.setUTCDate(1);
    earliest.setUTCHours(0);
    if (config.ageAlign) {
        earliest.setUTCDate(baseBirthday.getUTCDate());
    }
    let delta = (slowest - fastest) * 0.1;
    slowest += delta;
    fastest = Math.floor((fastest - delta) / 100) * 100;

    config.drawName = config.swimmerList.length > 1;
    config.eventStrs = eventStrs;
    config.values = values;
    config.slowest = slowest;
    config.fastest = fastest;
    config.earliest = earliest;
    config.latest = latest;

    config.duration = latest - earliest;
    config.delta = slowest - fastest;
    config.width = (config.duration / _1DayInMilliSeconds / 3) * config.xZoomFactor;
    config.height = 400 * config.yZoomFactor;
    config.marginL = 50;
    config.marginR = 500;
    config.marginT = 50;
    config.marginB = 30;
}

function drawXYscale(ctx, config) {
    let birthday = config.ageAlign ? config.values[0].birthday : null;
    let width = config.width;
    let height = config.height;
    let earliest = config.earliest;
    let latest = config.latest;
    let fastest = config.fastest;
    let slowest = config.slowest;
    let delta = config.delta;
    let duration = config.duration;

    // draw the axis
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'blue';
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, 0);

    // draw the x-scale
    if (!birthday) {
        for (let date = new Date(earliest); date < latest; date.setUTCMonth(date.getUTCMonth() + 1)) {
            let x = (date - earliest) / duration * width;
            ctx.moveTo(x, height);
            if (date.getUTCMonth() === 0) {
                ctx.lineTo(x, height - 12);
                ctx.fillText(date.getUTCFullYear(), x - 10, height + 15);
            } else {
                ctx.lineTo(x, height - (date.getUTCMonth() % 6 === 0 ? 9 : 5));
            }
        }
    } else {
        let date = new Date(birthday);
        date.setUTCFullYear(earliest.getUTCFullYear() - 1);
        let end = new Date(birthday);
        end.setUTCFullYear(latest.getUTCFullYear() + 1);
        let diff = end.getUTCFullYear() - date.getUTCFullYear();
        let interval = (end - date) / diff / 12;

        date = date.getTime();
        for (let i = 0; date < latest; ++i, date += interval) {
            let x = (date - earliest) / duration * width;
            if (x < 1) {
                continue;
            }
            ctx.moveTo(x, height);
            ctx.moveTo
            if (i % 12 === 0) {
                ctx.fillText(new Date(date).getUTCFullYear() - birthday.getUTCFullYear(), x, height + 15);
            }
            ctx.lineTo(x, height - (i % 6 === 0 ? 12 : 5));
        }
    }
    ctx.stroke();

    // draw the y-scale
    let lineHeight = 50;
    let fontHeight = 20;
    let interval = Math.ceil(delta / 100 / (height / fontHeight)) * 100;
    let intervalHeight = interval / delta * height;
    let lineInterval = Math.ceil(lineHeight / intervalHeight) * interval;
    for (let t = fastest; t <= slowest; t += interval) {
        let y = height - (t - fastest) / delta * height;
        if (t > fastest) {
            if ((t - fastest) % lineInterval === 0) {
                ctx.strokeStyle = 'lightgray';
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'black';
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(5, y);
                ctx.moveTo(width, y);
                ctx.lineTo(width - 5, y);
                ctx.stroke();
            }
        }
        let time = formatTime(t).slice(0, -3);
        ctx.fillText(time, -5 - ctx.measureText(time).width, y + 3);
        ctx.fillText(time, width + 5, y + 3);
    }

    ctx.stroke();
}

function drawMeetStandards(ctx, config) {
    let swimerList = config.swimmerList;
    if (swimerList.length > 1) {
        return;
    }
    let swimmer = swimerList[0].swimmer;
    let genderStr = convetToGenderString(swimmer.gender);
    let eventStr = _eventList[config.event]

    let lines = []
    let meetStds = getMeetStandards(swimmer.age);
    for (let meet of meetStds) {
        let std = meet[genderStr].get(eventStr);
        if (!std || std[1] < config.fastest || std[1] > config.slowest) {
            continue;
        }
        lines.push([std[1], std[0], meet.meet]);
    }

    lines.sort((a, b) => a[1] - b[1]);
    let step = 20;
    let colors = ["#F66", "#6A6", "#66F", "#A6A", "#6AA", "#F99", "#9F9", "#99F", "#FF9", "#F9F", "#9FF"];
    for (let [i, line] of lines.entries()) {
        let y = config.height - (line[0] - config.fastest) / config.delta * config.height;
        ctx.beginPath();
        ctx.setLineDash([3, 7]);
        ctx.strokeStyle = ctx.fillStyle = colors[i % colors.length];
        ctx.moveTo(0, y);
        ctx.lineTo(config.width, y);
        ctx.stroke();
        ctx.fillText(line[1] + '  ' + line[2], config.width + 40, config.height - i * step);
        //console.log(std);
    }
}

function drawAgeDots(ctx, config) {
    if (config.swimmerList.length > 1 && !config.ageAlign) {
        return;
    }

    let birthday = config.values[0].birthday;

    // draw age dots line and age text
    for (let d = new Date(birthday); d < config.latest; d.setUTCFullYear(d.getUTCFullYear() + 1)) {
        let x = (d - config.earliest) / config.duration * config.width;
        if (x < 1) {
            continue;
        }
        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle = '#89F';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, config.height);
        ctx.stroke();
        ctx.fillText(d.getUTCFullYear() - birthday.getUTCFullYear(), x + 5, 10);
        ctx.fill();
    }
}

// draw the cruve and dots, and find the tip row
function drawCurve(ctx, config) {
    let idx = config.idx;
    ctx.font = "16px Verdana";
    ctx.setLineDash([]);
    let tipRow;
    let topTextOffset = 20;
    for (let [index, value] of config.values.entries()) {

        ctx.strokeStyle = ctx.fillStyle = graphColors[index];
        if (value.length > 0) {
            // draw the event name on the top
            ctx.fillText(config.eventStrs[index], topTextOffset, -10);
            let offset = ctx.measureText(config.eventStrs[index]).width;

            // draw the swimmer name on the top
            if (config.drawName) {
                ctx.fillText(value.name, topTextOffset, -30);
                offset = Math.max(offset, ctx.measureText(value.name).width);
            }

            topTextOffset += offset + 30;
        }

        let pre;
        let preTime;
        let highLight = [];
        for (let row of value) {
            let t = timeToInt(row[idx.time]);
            let d = new Date(new Date(row[idx.date]) - value.bdayOffset);
            let x = (d - config.earliest) / config.duration * config.width;
            let y = config.height - (t - config.fastest) / config.delta * config.height;

            pre = pre || [x, y];

            ctx.beginPath();
            ctx.moveTo(pre[0], pre[1]);
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();

            if (!tipRow && ctx.isPointInPath(config.mouseX, config.mouseY)) {
                tipRow = [row, x, y, value.name];
            }

            if (preTime && preTime < t) {
                highLight.push([x, y]);
            }
            preTime = min(preTime, t);
            pre = [x, y];
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        for (let [x, y] of highLight) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    return tipRow;
}

function drawTip(ctx, tipRow, config) {
    if (!tipRow) {
        return;
    }

    let idx = config.idx;
    let [row, x, y, name] = tipRow;
    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.stroke();

    let meetName = config.meetDict.get(row[idx.meet])[config.meetDict.idx.name];
    let dateAge = formatDate(row[idx.date]) + '   ' + _eventList[row[idx.event]].split(' ').pop() + '   Age:' + row[idx.age];
    let timeStd = row[idx.time] + '     ' + formatStandard(row[idx.std]) + (config.drawName ? '  (' + name + ')' : '');

    ctx.beginPath();
    ctx.fillStyle = "#777C";
    ctx.roundRect(x + 5, y - 70,
        Math.max(ctx.measureText(timeStd).width, Math.max(ctx.measureText(meetName).width, ctx.measureText(dateAge).width)) + 10, 66, 5);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#FFF';
    ctx.fillText(timeStd, x + 10, y - 10);
    ctx.fillText(dateAge, x + 10, y - 10 - 20);
    ctx.fillText(meetName, x + 10, y - 10 - 2 * 20);
    ctx.fill();
}

function mergeConfig(config, newConfig) {
    config = config || {};
    for (let key in newConfig) {
        config[key] = newConfig[key];
    }
    return config;
}

async function defaultConfig(pkey) {
    let swimmer = await loadDetails(pkey);
    return {
        pkey: pkey,
        swimmerList: [swimmer],
        mouseX: 0,
        mouseY: 0,
        ageAlign: false,
        SCY: true,
        SCM: true,
        LCM: true,
        xZoomFactor: parseFloat(localStorage.getItem('xZoomFactor')) || 1,
        yZoomFactor: parseFloat(localStorage.getItem('yZoomFactor')) || 1,
        meetDict: swimmer.meetDict,
        event: swimmer.events[swimmer.events.length - 1][swimmer.events.idx.event],
        idx: swimmer.events.idx
    }
}

async function showGraph(canvas, config) {  //, pkey, event, mouseX, mouseY) {
    TabView.tab('swimmerTabView', 3);

    // pkey, event, mouseX, mouseY, ageAlign, SCY, SCM, LCM, swimerList, xZoomFactor, yZoomFactor
    // evnetStrs, values, slowest, fastest, earliest, latest, duration, width, height, idx, meetDict
    canvas = canvas || document.getElementById('canvas');
    config = canvas.config = mergeConfig(canvas.config || await defaultConfig(config.pkey), config);

    if (config.swimmerList.length == 0) {
        config.swimmerList.push(await loadDetails(config.pkey));
    }

    updateGraphTitle(config);

    prepareGraphData(config);

    // prepare the canvas
    canvas.height = config.height + config.marginT + config.marginB;
    canvas.width = config.width + config.marginL + config.marginR;

    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(config.marginL, config.marginT);
    ctx.font = "14px Verdana";

    canvas.classList.remove('hide');

    drawXYscale(ctx, config);
    //drawMeetStandards(ctx, config);
    drawAgeDots(ctx, config);
    let tipRow = drawCurve(ctx, config);
    drawTip(ctx, tipRow, config);
}

async function addKeypress(input, e) {
    if (e.key === 'Enter') {
        await addSearch(input.value);
    }
}

async function addSearch(value, all) {
    document.getElementById('adding-list').innerHTML = '<div class=""><div class="loader"></div></div>';
    let dropdown = Dropdown.get('add-search');
    dropdown.open();

    value = value || document.getElementById('add-input').value;
    let html = [];
    if (value) {
        let list = await loadSearch(value, all);
        let idx = list.idx;
        html.push('<table style="cursor:pointer;border-collapse:collapse;" class="left"><tbody>');
        for (let row of list) {
            html.push(`<tr onclick="addSwimmer(${row[idx.pkey]})"><td>${row[idx.name]}</td><td>${row[idx.age]}</td><td>${row[idx.lsc]}</td><td>${row[idx.clubName]}</td></tr>`);
        }
        html.push('</tbody></table>');
    }
    html.push('<p class="tip">Click on the row to add the swimmer.</p>');

    document.getElementById('adding-list').innerHTML = html.join('');
}

async function addSwimmer(pkey) {
    document.getElementById('adding-list').innerHTML = '<div class="loading"><div class="loader"></div></div>';

    let canvas = document.getElementById('canvas');
    let swimmerList = canvas.config.swimmerList;

    let skip = false;
    for (let swimmer of swimmerList) {
        if (swimmer.swimmer.pkey == pkey) {
            skip = true;
            break;
        }
    }

    if (!skip) {
        let swimmer = await loadDetails(pkey);
        swimmerList.push(swimmer);
        await updateSwimmerList(canvas.config);
    }

    let dropdown = Dropdown.get('add-search');
    dropdown.close();
}

async function removeSwimmer(pkey) {
    let canvas = document.getElementById('canvas');
    let swimmerList = canvas.config.swimmerList;

    for (let [i, s] of swimmerList.entries()) {
        if (s.swimmer.pkey == pkey) {
            swimmerList.splice(i, 1);
            break;
        }
    }

    await updateSwimmerList(canvas.config);
}

async function checkSwimmer(elem, pkey) {
    let canvas = document.getElementById('canvas');
    let swimmerList = canvas.config.swimmerList;

    for (let s of swimmerList) {
        if (s.swimmer.pkey == pkey) {
            s.hide = !elem.checked;
            break;
        }
    }

    await showGraph(canvas);
}

async function updateSwimmerList(config) {
    let html = [];

    if (config.swimmerList.length > 1) {
        html.push(createPopup(createCheckbox('age-align', 'Align by Age', config.ageAlign, 'showGraph(null,{ageAlign:this.checked})'),
            `Compare swimmers' times at the same age.`));
    }

    for (let swimmer of config.swimmerList) {
        let id = 's_' + swimmer.swimmer.pkey;
        let name = swimmer.swimmer.alias + ' ' + swimmer.swimmer.lastName
        html.push(createCheckbox(id, name, !swimmer.hide, `checkSwimmer(this,${swimmer.swimmer.pkey})`),
            `<button class="xbutton" onclick="removeSwimmer(${swimmer.swimmer.pkey})">❌</button>`);
    }

    document.getElementById('swimmer-list').innerHTML = html.join('');
    await showGraph();
}

function formatTime(time) {
    let min = Math.floor(time / 6000);
    let sec = time % 6000;
    let minStr = min ? (min + ':') : '';
    let secStr = (sec / 100).toFixed(2).padStart(5, '0');
    return minStr + secStr;
}

async function buildRankingCell(pkey, timeInt, genderStr, event, ageKey, zone, lsc, club) {
    let html = [];

    let rankDataKey = getRankDataKey(genderStr, event, ageKey, zone, lsc, club);

    let values = await peekRank(rankDataKey);
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
    // 0        1     2     3     4          5     6        7     8         9     10
    if (values) {
        let rank = calculateRank(values, pkey, timeInt);
        // html.push(`<td class="full"><button onclick="go('rank', '${rankDataKey}')">${rank}</button></td>`);
        html.push('<td class="full rk">', createClickableDiv(rank, `go('rank','${rankDataKey}')`), '</td>');
    } else {
        let id = rankDataKey + '_' + pkey;
        html.push(`<td class="full rk" id="${id}">`, createClickableDiv('<div class="loader"></div>', `go('rank','${rankDataKey}')`), '</td>');

        _backgroundActions.push([getRank, [rankDataKey, timeInt, pkey, id]]);
    }

    return html.join('');
}

function createClickableDiv(content, action) {
    return `<div class="clickable" onclick="${action}">${content}</div>`;
}

async function getRank(params) {
    let [mapKey, timeInt, pkey, id] = params;

    let data = await loadRank(mapKey);
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
    // 0        1     2     3     4          5     6        7     8         9     10

    const element = document.getElementById(id);
    if (!element) {
        console.log('Cannot find element: ' + id);
        return;
    }

    let rank = calculateRank(data.values, pkey, timeInt);

    element.innerHTML = createClickableDiv(rank, `go('rank', '${mapKey}')`);
}

function calculateRank(values, pkey, timeInt) {
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
    // 0        1     2     3     4          5     6        7     8         9     10

    let rank = '';
    for (let i = 0; i < values.length; ++i) {
        if (pkey == values[i][values.idx.pkey] || timeInt < timeToInt(values[i][values.idx.time])) {
            rank = i + 1;
            break;
        }
    }

    return rank;
}

function createAgeBestTimeTableHeader(uniqueAges) {
    let html = ['<tr class="wt"><th>Course</th><th>Stroke</th><th>Distance</th>'];
    for (let age of uniqueAges) {
        html.push('<th>', age, '</th>');
    }
    html.push('</tr>');
    return html.join('');
}

function createAgeBestTimeTable(data, fastRowList, rowInfo) {
    // events
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    // fastRowList
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    let idx = data.events.idx;
    let html = ['<div class="content"><h2>Age Best Time</h2><table class="fill"><tbody>'];

    // get all age column
    let ages = new Set(data.events.map(e => e[idx.age]));
    let uniqueAges = [...ages];
    uniqueAges.sort((a, b) => b - a);

    // create the table header
    let header = createAgeBestTimeTableHeader(uniqueAges);
    html.push(header);

    for (let i = 0; i < fastRowList.length; ++i) {
        let row = fastRowList[i];
        let event = row[idx.event];
        let [dist, stroke, course] = _eventList[event].split(' ');

        if (rowInfo[i].length == 2 && i > 0) {
            html.push(header);
        }

        html.push(`<tr class="d${dist} ${stroke}">`);
        if (rowInfo[i].length == 2) {
            html.push(`<td class="age" rowspan="${rowInfo[i][1]}">${course}</td>`);
        }
        if (rowInfo[i].length > 0) {
            html.push(`<td class="bold" rowspan="${rowInfo[i][0]}">${_storkeMap[stroke]}</td>`);
        }

        html.push('<td class="full">', createClickableDiv(dist, `showGraph(null,{pkey:${data.swimmer.pkey},event:${event}})`), '</td>');
        for (let age of uniqueAges) {
            let bestTimeEvent = findBestTimeEventByAge(data.events, event, age);
            if (bestTimeEvent) {
                let preBestTime = findPreBestTimeByAge(data.events, event, age);
                let bestTime = bestTimeEvent[idx.time];
                let std = formatStandard(bestTimeEvent[idx.std]);
                let short = formatStandard(std, true);
                let date = formatDate(bestTimeEvent[idx.date]);
                let cls = !preBestTime ? '' : timeToInt(bestTime) < timeToInt(preBestTime) ? 'dp' : 'ad';
                html.push('<td class="tc">', buildTimeCell(bestTime, createPopup(short, std), date, cls), '</td>');
            } else {
                html.push('<td></td>');
            }
        }
        html.push('</tr>');
    }

    html.push('</tbody></table></div>');

    return html.join('');
}

function findBestTimeEventByAge(events, event, age) {
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    let idx = events.idx;
    let bestTimeEvent;
    for (let row of events) {
        if (row[idx.event] === event && row[idx.age] === age) {
            if (!bestTimeEvent || timeToInt(row[idx.time]) < timeToInt(bestTimeEvent[idx.time])) {
                bestTimeEvent = row;
            }
        }
    }
    return bestTimeEvent;
}

function findPreBestTimeByAge(events, event, age) {
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    let idx = events.idx;
    let bestTime;
    for (let row of events) {
        if (row[idx.event] === event && row[idx.age] < age) {
            if (!bestTime || timeToInt(row[idx.time]) < timeToInt(bestTime)) {
                bestTime = row[idx.time];
            }
        }
    }
    return bestTime;
}

function createMeetTable(data) {
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8

    let idx = data.events.idx;
    // group meet by course
    let courses = {};
    for (let row of data.events) {
        let course = getEventCourse(row[idx.event]);
        if (!courses[course]) {
            courses[course] = [];
            courses[course].idx = idx;
        }
        courses[course].push(row);
    }

    let html = ['<div class="content"><h2>Meets</h2>'];

    // create the meet tables
    for (let course of _courseOrder) {
        let evts = courses[course];
        if (evts) {
            html.push(createMeetTableByCourse(course, evts, data.swimmer.pkey, data.meetDict));
        }
    }

    html.push('</div>');

    return html.join('');
}

function createMeetTableByCourse(course, events, pkey, meetDict) {
    // time, age, std, lsc, club, date, event, meet, gender
    // 0     1    2    3    4     5     6      7     8
    let idx = events.idx;
    let html = ['<div class="match-size"><span>', course, ' Event Count: ', events.length,
        '</span></div><table class="fill"><tbody>'];

    // remove dup event in one meet
    let meetEvents = new Map();
    for (let row of events) {
        let meetEventKey = row[idx.meet] + '-' + row[idx.event];
        let evt = meetEvents.get(meetEventKey);
        if (!evt || timeToInt(row[idx.time]) < timeToInt(evt[idx.time])) {
            meetEvents.set(meetEventKey, row);
        }
    }

    // sort by meet date (oldest first)
    let eventList = [...meetEvents.values()];
    eventList.sort((a, b) => a[idx.date] < b[idx.date] ? -1 : 1);
    eventList.idx = idx;

    // calculate event time delta and append to the event list
    idx.delta = eventList[0].length;

    let eventBestTime = new Map();
    for (let row of eventList) {
        let event = row[idx.event];
        let timeInt = timeToInt(row[idx.time]);

        let preBestTime = eventBestTime.get(event);
        if (!preBestTime) {
            row.push(null);
            eventBestTime.set(event, timeInt);
        } else {
            row.push(timeInt - preBestTime);
            if (timeInt < preBestTime) {
                eventBestTime.set(event, timeInt);
            }
        }
    }
    // time, age, std, lsc, club, date, event, meet, gender, (delta)
    // 0     1    2    3    4     5     6      7     8       9

    // talbe column info & row info
    let columnInfo = countEventTypeByStroke(eventList);
    let rowInfo = countMeetByAge(eventList, meetDict);

    // calculate the total count
    let rowCount = 0;
    for (let rows of rowInfo) {
        rowCount += rows.length - 1;
    }

    // create the table header (2 rows)
    html.push('<tr><th rowspan="2"></th><th rowspan="2">Age</th><th rowspan="2">Date</th>');
    for (let col of columnInfo) {
        html.push(`<th colspan="${col.length - 1}">${_storkeMap[col[0]]}</th>`);
    }
    html.push('<th rowspan="2">Meet</th><th rowspan="2">Team</th></tr><tr>');
    for (let col of columnInfo) {
        for (let i = 1; i < col.length; ++i) {
            let evt = _eventIndexMap.get(`${col[i]} ${col[0]} ${course}`);
            let action = `showGraph(null,{pkey:${pkey},event:${evt}})`;
            html.push('<td class="full">', createClickableDiv(col[i], action), '</td>');
        }
    }
    html.push('</tr>');

    // create the cell info map (meetKey + dist + stroke + course) -> row
    let cellInfo = new Map();
    for (let row of eventList) {
        let cellKey = row[idx.meet] + '-' + _eventList[row[idx.event]];
        cellInfo[cellKey] = row;
    }

    // create the meet table body
    let first = true;
    for (let rows of rowInfo) {
        for (let i = 0; i < rows.length; ++i) {
            html.push('<tr>');
            if (first) {
                first = false;
                html.push(`<td rowspan="${rowCount}" class="age">${course}</td>`);
            }

            if (i == 0) {
                html.push(`<td rowspan="${rows.length - 1}" class="age">${rows[0]}</td>`);
                ++i;
            }

            let meetKey = rows[i];
            html.push('<td>', formatDate(meetDict.get(meetKey)[meetDict.idx.date]), '</td>');

            let clubName;
            for (let cols of columnInfo) {
                let stroke = cols[0];
                for (let j = 1; j < cols.length; ++j) {
                    let dist = cols[j];
                    html.push(`<td class="d${dist} ${stroke} tc">`);

                    let cellKey = meetKey + '-' + dist + ' ' + stroke + ' ' + course;
                    let cell = cellInfo[cellKey];
                    if (cell) {
                        let delta = cell[idx.delta];
                        let style = delta > 0 ? 'ad' : delta < 0 ? 'dp' : '';
                        let time = cell[idx.time];
                        let std = formatStandard(cell[idx.std]);
                        let short = formatStandard(std, true);

                        html.push(buildTimeCell(time, createPopup(short, std), formatDelta(delta), style));
                        clubName = cell[idx.clubName];
                    }
                    html.push('</td>');
                }
            }

            html.push('<td class="left">', meetDict.get(meetKey)[meetDict.idx.name], '</td><td class="left">', clubName, '</td></tr>');
        }
    }

    html.push('</tbody></table>');

    return html.join('');
}

function buildTimeCell(time, std, delta, color, percent) {
    if (!time) {
        return '<div>&nbsp;</div><div class="st">&nbsp;</div>';
    }

    let html = [`<div class="${color || ''}">${time}</div>`];
    if (std) {
        html.push(`<div class="st">${std}</div><div class="dd ${color || ''}">${delta}</div>`);
    } else {
        html.push(`<div class="ds ${color || ''}">${delta === '' ? '&nbsp;' : delta}</div>`);
    }
    if (percent < 100) {
        html.push(`<div class="r" style="left:${percent}%"></div>`);
    }
    return html.join('');
}

function countMeetByAge(eventList, meetDict) {
    // time, age, std, lsc, club, date, event, meet, gender, (delta)
    // 0     1    2    3    4     5     6      7     8       9

    let idx = eventList.idx;
    // group meet by age
    let ages = new Map();
    for (let row of eventList) {
        let age = row[idx.age];
        let set = ages.get(age);
        if (!set) {
            set = new Set();
            ages.set(age, set);
        }
        set.add(row[idx.meet]);
    }

    // sort ages (oldest first)
    let resultArray = [];
    let ageList = [...ages.keys()];
    ageList.sort((a, b) => b - a);

    for (let age of ageList) {
        let meetArray = [...ages.get(age)];
        meetArray.sort((a, b) => meetDict.get(a)[meetDict.idx.date] > meetDict.get(b)[meetDict.idx.date] ? -1 : 1);
        resultArray.push([age, ...meetArray]);
    }
    return resultArray;
}

function countEventTypeByStroke(eventList) {
    // time, age, std, lsc, club, date, event, meet, gender, (delta)
    // 0     1    2    3    4     5     6      7     8       9

    let idx = eventList.idx;
    let result = new Map();
    for (let row of eventList) {
        let [dist, stroke, course] = _eventList[row[idx.event]].split(' ');
        let set = result.get(stroke);
        if (!set) {
            set = new Set();
            result.set(stroke, set);
        }

        set.add(Number(dist));
    }

    let resultArray = [];
    for (let stroke of _strokeOrder) {
        let set = result.get(stroke);
        if (set) {
            let array = [...set];
            array.sort((a, b) => a - b);
            resultArray.push([stroke, ...array]);
        }
    }

    return resultArray;
}

///////////////////////////////////////////////////////////////////////////////////////////////
// rank functions

async function rank(key) {
    let data = await loadRank(key);
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
    // 0        1     2     3     4          5     6        7     8         9     10

    await showRank(data, key);
}

async function peekRank(key) {
    return await LocalCache.get('rank/' + key);
}

async function loadRank(key) {
    let values = await LocalCache.func('rank/' + key, async () => {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

        let values;
        if (clubName) {
            values = await loadRankDataByClub(key);

        } else {
            values = await LoadRankDataAll(key);
            // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey
            // 0        1     2     3     4          5     6        7     8         9

            values = await filterByAge(values, ageKey);
            // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
            // 0        1     2     3     4          5     6        7     8         9     10
        }

        if (!values || values.length == 0) {
            return;
        }

        let idx = values.idx;

        // truncate the data
        if (values.length > 1000) {
            values = values.slice(0, 1000);
        }

        // remove sortkey from values and idx
        for (let row of values) {
            // shorten the date
            row[idx.date] = row[idx.date].substring(0, 10);

            row.splice(idx.sortkey, 1);
        }
        for (let key in idx) {
            if (idx[key] > idx.sortkey) {
                idx[key] -= 1;
            }
        }
        delete idx.sortkey;
        values.idx = idx;

        return values;
    }, null, 2);

    if (values) {
        return await postLoadRank(values);
    }
}

async function postLoadRank(values) {
    let idx = values.idx;
    let meets = new Set(values.map(row => row[idx.meet]));

    return {
        values: values,
        meetDict: await _meetDictinary.loadMeets(meets)
    };
}


async function loadClubAgeSwimmerList(lsc, clubName, ageKey) {
    let cacheKey = 'club/' + lsc + '_' + clubName + '_' + ageKey;

    return await LocalCache.func(cacheKey, async () => {
        let [from, to] = decodeAgeKey(ageKey);

        let bodyObj = {
            metadata: [
                {
                    title: 'pkey',
                    dim: "[Persons.PersonKey]",
                    datatype: "numeric"
                },
                {
                    title: 'age',
                    dim: "[Persons.Age]",
                    datatype: "numeric",
                    filter: {
                        from: from,
                        to: to
                    }
                },
                {
                    dim: "[Persons.ClubName]",
                    datatype: "text",
                    filter: {
                        contains: clubName
                    },
                    panel: "scope"
                },
                {
                    dim: "[Persons.LscCode]",
                    datatype: "text",
                    filter: {
                        equals: lsc
                    },
                    panel: "scope"
                }
            ],
            count: 1000
        };

        return await fetchSwimValues(bodyObj);
    });
}

async function loadRankDataByClub(key) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

    let year = getSessionYear();

    let swimmerList = await loadClubAgeSwimmerList(lsc, clubName, ageKey);
    if (!swimmerList || swimmerList.length == 0) {
        return;
    }

    // pkey, age
    // 0     1

    let bodyObj = {
        metadata: [
            {
                title: 'name',
                dim: "[Person.FullName]",
                datatype: "text"
            },
            {
                title: 'date',
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days"
            },
            {
                title: 'time',
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text"
            },
            {
                title: 'clubName',
                dim: "[OrgUnit.Level4Name]",
                datatype: "text",
            },
            {
                title: 'lsc',
                dim: "[OrgUnit.Level3Code]",
                datatype: "text"
            },
            {
                title: "meet",
                dim: "[UsasSwimTime.MeetKey]",
                datatype: "numeric"
            },
            {
                title: 'pkey',
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: swimmerList.map(row => row[swimmerList.idx.pkey])
                }
            },
            {
                title: 'sortkey',
                dim: "[UsasSwimTime.SortKey]",
                datatype: "text",
                sort: "asc"
            },
            {
                title: 'event',
                dim: "[UsasSwimTime.SwimEventKey]",
                datatype: "numeric",
                filter: {
                    equals: Number(event)
                },
                panel: "scope"
            },
            {
                dim: "[UsasSwimTime.EventCompetitionCategoryKey]",
                datatype: "numeric",
                filter: {
                    equals: convertToGenderCode(genderStr)
                },
                panel: "scope"
            },
            {
                dim: "[SeasonCalendar.SeasonYearDesc]",
                datatype: "text",
                filter: {
                    members: [
                        year + " (9/1/" + (year - 1) + " - 8/31/" + year + ")",
                        (year - 1) + " (9/1/" + (year - 2) + " - 8/31/" + (year - 1) + ")",
                        (year - 2) + " (9/1/" + (year - 3) + " - 8/31/" + (year - 2) + ")"
                    ]
                },
                panel: "scope"
            }
        ],
        count: 5000
    }

    let list = await fetchSwimValues(bodyObj, 'event');
    if (!list || list.length == 0) {
        return;
    }

    // Create a mapping of pkey to age
    let pkeyToAgeMap = new Map(swimmerList);

    // Filter to get the first(fast) time of each swimmer & append the age to the end of each row of list
    list.idx.age = list[0].length;
    let values = [];
    for (let row of list) {
        let pkey = row[list.idx.pkey];
        let age = pkeyToAgeMap.get(pkey);
        if (age) {
            row.push(age);
            values.push(row);
            pkeyToAgeMap.delete(pkey);
        }
    }

    values.idx = list.idx;
    return values;
}

function getRankDataKey(genderStr, event, ageKey, zone, lsc, clubName) {
    return genderStr + '_' + ageKey + '_' + event + '_' + (zone || '') + '_' + (lsc || '') + '_' + (clubName || '');
}

function decodeRankMapKey(mapKey) {
    return mapKey.split('_');
}

function getSessionYear() {
    let now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    return month < 9 ? year : year + 1;
}

async function LoadRankDataAll(mapKey) {
    let [genderStr, ageKey, eventKey, zone, lsc, clubName] = decodeRankMapKey(mapKey);

    let year = getSessionYear();

    let [from, to] = decodeAgeKey(ageKey);
    from = from > 0 ? from - 2 : 0;

    let bodyObj = {
        metadata: [
            {
                title: 'name',
                dim: "[UsasSwimTime.FullName]",
                datatype: "text"
            },
            {
                title: 'date',
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days"
            },
            {
                title: 'time',
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text"
            },
            {
                title: 'clubName',
                dim: "[OrgUnit.Level4Name]",
                datatype: "text",
            },
            {
                title: 'lsc',
                dim: "[OrgUnit.Level3Code]",
                datatype: "text"
            },
            {
                title: "meet",
                dim: "[UsasSwimTime.MeetKey]",
                datatype: "numeric"
            },
            {
                title: 'pkey',
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric"
            },
            {
                title: 'sortkey',
                dim: "[UsasSwimTime.SortKey]",
                datatype: "text",
                sort: "asc"
            },
            {
                title: 'event',
                dim: "[UsasSwimTime.SwimEventKey]",
                datatype: "numeric",
                filter: {
                    equals: Number(eventKey)
                },
                panel: "scope"
            },
            {
                dim: "[UsasSwimTime.AgeAtMeetKey]",
                datatype: "numeric",
                filter: {
                    from: from,
                    to: to
                },
                panel: "scope"
            },
            {
                dim: "[EventCompetitionCategory.EventCompetitionCategoryKey]",
                datatype: "numeric",
                filter: {
                    equals: convertToGenderCode(genderStr)
                },
                panel: "scope"
            },
            {
                dim: "[SeasonCalendar.SeasonYearDesc]",
                datatype: "text",
                filter: {
                    members: [
                        year + " (9/1/" + (year - 1) + " - 8/31/" + year + ")",
                        (year - 1) + " (9/1/" + (year - 2) + " - 8/31/" + (year - 1) + ")",
                        // (year - 2) + " (9/1/" + (year - 3) + " - 8/31/" + (year - 2) + ")"
                    ]
                },
                panel: "scope"
            }
        ],
        count: 10000
    }

    if (zone) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level2Code]",
            datatype: "text",
            filter: {
                equals: zone
            },
            panel: "scope"
        });
    }

    if (lsc) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level3Code]",
            datatype: "text",
            filter: {
                equals: lsc
            },
            panel: "scope"
        });
    }

    return await fetchSwimValues(bodyObj, 'event');
}

function decodeAgeKey(ageKey) {
    let from = 0;
    let to = 99;
    if (ageKey == '10U') {
        to = 10;
    } else if (ageKey == '19O') {
        from = 19;
    } else {
        let parts = ageKey.split('-');
        from = Number(parts[0]);
        to = Number(parts[1]);
    }
    return [from, to];
}

async function filterByAge(values, ageKey) {
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey
    // 0        1     2     3     4          5     6        7     8         9

    if (!values || values.length == 0) {
        return values;
    }

    // dedup the pkey
    let pkeys = new Set(values.map(row => row[values.idx.pkey]));

    let [from, to] = decodeAgeKey(ageKey);

    let bodyObj = {
        metadata: [
            {
                title: 'pkey',
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: [...pkeys]
                }
            },
            {
                title: 'age',
                dim: "[Persons.Age]",
                datatype: "numeric",
                filter: {
                    from: from,
                    to: to
                },
            }
        ],
        count: pkeys.length
    };

    let pkeyToAgeList = await fetchSwimValues(bodyObj);
    if (!pkeyToAgeList) {
        return values;
    }
    // pkey, age
    // 0     1

    // create new pkey set by age response.
    let pkeyAge = new Map(pkeyToAgeList);

    // append age to the end of each row
    values.idx.age = values[0].length;
    let result = [];
    for (let row of values) {
        let pkey = row[values.idx.pkey];
        let realAge = pkeyAge.get(pkey);
        if (realAge) {
            row.push(realAge);
            result.push(row);
            pkeyAge.delete(pkey);
        }
    }
    // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, (age)
    // 0        1     2     3     4          5     6        7     8         9     10
    result.idx = values.idx;
    return result;
}

async function showRank(data, key) {
    // sortkey, name, date, time, eventName, club, lsc, meet, event, pkey, (age)
    // 0        1     2     3     4          5     6    7     8      9     10
    let html = [];

    let oldBrowser = !(navigator.userAgent.indexOf('Chrome/120.') < 0);
    //oldBrowser = true;

    html.push('<div class="center-row top-margin"><p style="margin:0 5px 0 0">Age Group:</p>', createAgeGenderSelect(key, oldBrowser),
        '<p style="margin:0 5px 0 20px">Course:</p>', createCourseSelect(key, oldBrowser),
        '<p style="margin:0 5px 0 20px">Club:</p>', await buildClubSelect(key, oldBrowser), '</div>');

    html.push(showEventButtons(key));
    html.push(showRankTableTitle(key));

    let meetDate = localStorage.getItem('meetDate') || '';

    html.push('<div class="center-row top-margin"><p style="margin:0 5px 0 0">Meet date:</p>');
    if (oldBrowser) {
        html.push(`<input id="datepicker" value="${meetDate}">`);
    } else {
        html.push(`<input type="date" id="datepicker" value="${meetDate}" onchange="onMeetDateChange(this.value,'${key}')">`);
    }
    html.push('<p style="margin:0 5px 0 20px">Meet cut:</p>', buildStandardSelects(key, oldBrowser), '</div>');

    if (data) {
        html.push('<div id="rank-table" class="top-margin">', await showRankTable(data, key), '</div>');
    }

    html.push(addHide25Botton());

    updateContent(html.join(''));

    if (oldBrowser) {
        let root = location.protocol === 'file:' ? '' : '/files/';
        loadCSS(`${root}datepicker.material.css`);
        await loadScript(`${root}datepicker.js`);
        new Datepicker('#datepicker', {
            serialize: (date) => {
                let str = typeof date === 'string' ? date : date.toJSON().substring(0, 10);
                let part = str.split('-');
                return part[1] + '/' + part[2] + '/' + part[0];
            },
            onChange: (date) => onMeetDateChange(date.toJSON().substring(0, 10), key)
        });
    }
}

function loadScript(src) {
    let id = encodeURIComponent(src);
    if (document.getElementById(id)) {
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.id = id;

        script.onload = () => {
            resolve();
        };

        script.onerror = () => {
            reject(new Error(`Failed to load script: ${src}`));
        };

        document.head.appendChild(script);
    });
}

function loadCSS(href) {
    let id = encodeURIComponent(href);
    if (document.getElementById(id)) {
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    link.id = id;

    document.head.appendChild(link);
}

function buildStandardSelects(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

    // prepare the standard options
    let [from, to] = decodeAgeKey(ageKey);
    let options = [];
    let set = new Set();
    for (let age = from; age <= to; ++age) {
        let meets = getMeetStandards(age);
        for (let [i, meet] of meets.entries()) {
            let std = meet[genderStr].get(_eventList[event]);
            if (std && !set.has(meet)) {
                set.add(meet);
                let opt = [meet.short, meet.age[0], meet.age[1], std[0]];
                let index = options.length;
                for (let o of options) {
                    if (o[0].includes(meet.short)) {
                        index = i + 1;
                        break;
                    }
                }
                options.splice(index, 0, opt);
            }
        }
    }

    let html = [];
    // generate the standard selection
    for (let [i, cls] of ['gn', 'bl', 'rd'].entries()) {
        let values = [['', '']];
        for (let option of options) {
            let [short, from, to, std] = option;
            let text = `${short} (${from == to ? from : from + '-' + to}) = ${std}`;
            let value = `${short}|${from}|${to}`;
            values.push([text, value]);
        }

        // load the standard from local storage
        let standard = localStorage.getItem('meetStds' + i) || '';

        let select = new Select('standard' + i, values, standard, async (value) => {
            localStorage.setItem('meetStds' + i, value);
            let table = document.getElementById('rank-table');
            let data = await loadRank(key);
            table.innerHTML = await showRankTable(data, key);
        });
        select.class = cls;
        html.push(select.render(custom));
    }

    return html.join('');
}

async function onMeetDateChange(value, key) {
    localStorage.setItem('meetDate', value);

    let table = document.getElementById('rank-table');
    let data = await loadRank(key);
    table.innerHTML = await showRankTable(data, key);
}

async function onStandardChange(index, value, key) {
    localStorage.setItem('meetStds' + index, value);

    let table = document.getElementById('rank-table');
    let data = await loadRank(key);
    table.innerHTML = await showRankTable(data, key);
}

function showEventButtons(key) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

    // sortkey, name, date, time, eventName, clubName, lsc, meetName, event, pkey, (age)
    // 0        1     2     3     4          5         6    7         8      9     10
    let html = [];
    let course = getEventCourse(event);
    let hide25 = localStorage.getItem('hide25');

    html.push('<div class="match-size top-margin">');

    for (let i = 1; i < _eventList.length; ++i) {
        let [d, s, c] = _eventList[i].split(' ');
        if (c == course && d != '_' && (d != '25' || !hide25)) {
            html.push(`<button class="d${d} ${s}" style="border:1px solid;width:45px;"`,
                ` onclick="go('rank', '${getRankDataKey(genderStr, i, ageKey, zone, lsc, clubName)}')">${s}<br>${d}</button>`);
        }
    }

    html.push('</div>');
    return html.join('');
}

function showRankTableTitle(key) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

    // sortkey, name, date, time, eventName, clubName, lsc, meetName, event, pkey, (age)
    // 0        1     2     3     4          5         6    7         8      9     10
    let html = [];

    html.push('<h2>');
    if (clubName) {
        html.push(clubName);
    } else if (lsc) {
        html.push(getLSCName(lsc));
    } else if (zone) {
        html.push(zone, ' Zone');
    } else {
        html.push('USA');
    }
    html.push('</h2><h3>', _eventList[event], ' &nbsp &nbsp ', ageKey, ' ', genderStr, '</h3>');

    return html.join('');
}

async function showRankTable(data, key) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
    let [from, to] = decodeAgeKey(ageKey);
    let meetDate = localStorage.getItem('meetDate');
    let standards = [];
    for (let [i, clr] of ['gn', 'bl', 'rd'].entries()) {
        let [short, f, t] = (localStorage.getItem('meetStds' + i) || '||').split('|');
        let meet = getMeetStandards(to).filter(m => m.short == short && m.age[0] == f && m.age[1] == t);
        if (meet && meet.length > 0) {
            let std = meet[0][genderStr].get(_eventList[event]);
            if (std) {
                standards.push([std, clr]);
            }
        }
    }
    standards.sort((a, b) => a[0][1] - b[0][1]);

    // sortkey, name, date, time, eventName, clubName, lsc, meetName, event, pkey, (age)
    // 0        1     2     3     4          5         6    7         8      9     10
    let idx = data.values.idx;
    let meetDict = data.meetDict;
    let html = [];

    if (data.values.length == 0) {
        html.push('No ranking data found.');
        return html.join('');
    }

    html.push('<table class="fill"><tbody><tr><th></th><th>Name</th><th>Time</th><th>Date</th><th>Age</th><th>Birthday</th><th>Team</th><th>LSC</th><th>Meet</th></tr>');
    let index = 0;
    let stdKeyBase = `${genderStr} ${ageKey} ${_eventList[event]}`;
    for (let row of data.values) {

        let range = await _birthdayDictionary.load(row[idx.pkey]);
        if (range && meetDate) {
            let bday = new Date(range[1]);
            bday.setUTCFullYear(bday.getUTCFullYear() + to + 1);
            if (bday <= new Date(meetDate)) {
                continue;
            }
        }

        let timeInt = timeToInt(row[idx.time]);
        let maxStd = '';
        let maxStdInt = '';
        for (let std of ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA']) {
            let stdKey = `${stdKeyBase} ${std}`;
            let [_, stdInt] = getAgeGroupMotivationTime(stdKey);
            if (timeInt > stdInt) {
                break;
            }
            maxStd = std;
            maxStdInt = stdInt;
        }
        let color = '';
        for (let [std, clr] of standards) {
            if (timeInt <= std[1]) {
                color = ` class="${clr}"`;
                break;
            }
        }

        let rowZone = getLSCZone(row[idx.lsc]);
        let rowTeamRankKey = rowZone ? getRankDataKey(genderStr, event, ageKey, rowZone, row[idx.lsc], row[idx.clubName]) : '';
        let rowlscRankKey = rowZone ? getRankDataKey(genderStr, event, ageKey, rowZone, row[idx.lsc], '') : '';

        html.push(`<tr${color}><td>`, ++index, '</td><td class="left full">', createClickableDiv(row[idx.name], `go('swimmer',${row[idx.pkey]})`),
            '</td><td class="tc">', buildTimeCell(row[idx.time], maxStd, maxStd ? formatDelta(timeInt - maxStdInt) : '&nbsp;'),
            '</td><td>', formatDate(row[idx.date]), '</td><td>', row[idx.age], '<td class="left">', BirthdayDictionary.format(range),
            `</td><td class="left${rowZone ? ' full' : ''}">`, rowZone ? createClickableDiv(row[idx.clubName], `go('rank','${rowTeamRankKey}')`) : row[idx.clubName],
            `</td><td class="left${rowZone ? ' full' : ''}">`, rowZone ? createClickableDiv(row[idx.lsc], `go('rank','${rowlscRankKey}')`) : row[idx.lsc],
            '</td><td class="left">', meetDict.get(row[idx.meet])[meetDict.idx.name], '</td></tr>');
    }
    html.push('</tbody></table>');
    return html.join('');
}

function createAgeGenderSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
    let values = [];
    for (let g of ['Female', 'Male']) {
        values.push([g]);
        for (let ag of ['10U', '11-12', '13-14', '15-16', '17-18', '19O']) {
            let value = getRankDataKey(g, event, ag, zone, lsc, clubName);
            values.push([ag + ' ' + g, value]);
        }
    }
    let select = new Select('age-gender-select', values, key, (v) => go('rank', v));
    select.class = custom ? '' : 'big';
    return select.render(custom);
}

function createCourseSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
    let values = [];
    let [dist, style, course] = _eventList[event].split(' ');
    for (let newCourse of _courseOrder) {
        let newEvent = fixDistance([dist, style, newCourse].join(' '));
        let newEventCode = _eventIndexMap.get(newEvent);
        values.push([newCourse, getRankDataKey(genderStr, newEventCode, ageKey, zone, lsc, clubName)]);
    }

    let select = new Select('course-select', values, key, (v) => go('rank', v));
    select.class = custom ? '' : 'big';
    return select.render(custom);
}

async function buildClubSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
    let values = [];

    values.push(['USA', getRankDataKey(genderStr, event, ageKey)]);

    values.push(['Zone']);
    for (let zoneCode of ['Central', 'Eastern', 'Southern', 'Western']) {
        values.push([zoneCode, getRankDataKey(genderStr, event, ageKey, zoneCode)])
    }

    if (zone) {
        values.push([zone + ' Zone']);
        for (let [lscCode, [lscName, zoneCode]] of lscMap) {
            if (zoneCode == zone) {
                values.push([lscName + ' (' + lscCode + ')', getRankDataKey(genderStr, event, ageKey, zone, lscCode)]);
            }
        }
    }

    if (lsc) {
        let clubDict = await _clubDictinary.loadClubMap(lsc);

        values.push([getLSCName(lsc) + ' (' + lsc + ')']);
        for (let [clubName, clubCode] of clubDict) {
            values.push([clubName + ' (' + clubCode + ')', getRankDataKey(genderStr, event, ageKey, zone, lsc, clubName)]);
        }
    }

    let select = new Select('club-select', values, key, (v) => go('rank', v));
    select.class = custom ? '' : 'big';
    select.valueEqualtoSelection = (val, ops) => {
        let [genderStrVal, ageKeyVal, eventVal, zoneVal, lscVal, clubVal] = decodeRankMapKey(val);
        let [genderStrOps, ageKeyOps, eventOps, zoneOps, lscOps, clubOps] = decodeRankMapKey(ops);
        return clubOps ? clubVal == clubOps : lscOps ? lscVal == lscOps : zoneOps ? zoneVal == zoneOps : !zoneOps;
    };

    return select.render(custom);
}

function fixDistance(eventStr) {
    let map = {
        "400 FR SCY": "500 FR SCY",
        "500 FR SCM": "400 FR SCM",
        "500 FR LCM": "400 FR LCM",
        "800 FR SCY": "1000 FR SCY",
        "1000 FR SCM": "800 FR SCM",
        "1000 FR LCM": "800 FR LCM",
        "1500 FR SCY": "1650 FR SCY",
        "1650 FR SCM": "1500 FR SCM",
        "1650 FR LCM": "1500 FR LCM",
    };
    return map[eventStr] || eventStr;
}

function timeToInt(stime) {
    let result = 0;
    if (stime) {
        let parts = stime.split(':');
        if (parts.length == 2) {
            result = parseInt(parts[0]) * 6000;
            parts[0] = parts[1];
        }
        parts = parts[0].split('.');
        result += parseInt(parts[0]) * 100 + parseInt(parts[1]);
    }
    return result;
}

//https://github.com/DVLP/localStorageDB
(function () {
    var win = typeof window !== 'undefined' ? window : {}
    var indexedDB = win.indexedDB || win.mozIndexedDB || win.webkitIndexedDB || win.msIndexedDB;
    if (typeof window !== 'undefined' && !indexedDB) {
        console.error('indexDB not supported');
        return;
    }
    var db,
        request = indexedDB.open('ldb', 1);
    request.onsuccess = function (evt) {
        db = this.result;
    };
    request.onerror = function (event) {
        console.error('indexedDB request error');
        console.log(event);
    };

    request.onupgradeneeded = function (event) {
        db = null;
        var store = event.target.result.createObjectStore('s', {
            keyPath: 'k'
        });

        store.transaction.oncomplete = function (e) {
            db = e.target.db;
        };
    };

    // if using proxy mode comment this

    var ldb = {
        ready: false,
        get: function (key, callback) {
            if (!db) {
                setTimeout(function () { ldb.get(key, callback); }, 50);
                return;
            }
            db.transaction('s').objectStore('s').get(key).onsuccess = function (event) {
                var result = (event.target.result && event.target.result['v']) || null;
                callback(result);
            };
        },
        set: function (key, value, callback) {
            if (!db) {
                setTimeout(function () { ldb.set(key, value, callback); }, 50);
                return;
            }
            let txn = db.transaction('s', 'readwrite');
            txn.oncomplete = function (event) {
                var toString$ = {}.toString;
                if (toString$.call(callback).slice(8, -1) === 'Function') {
                    callback();
                }
            }
            txn.objectStore('s').put({
                'k': key,
                'v': value,
            });
            txn.commit();
        },
        delete: function (key, callback) {
            if (!db) {
                setTimeout(function () { ldb.delete(key, callback); }, 50);
                return;
            }
            db.transaction('s', 'readwrite').objectStore('s').delete(key).onsuccess = function (event) {
                if (callback) callback();
            };
        },
        list: function (callback) {
            if (!db) {
                setTimeout(function () { ldb.list(callback); }, 50);
                return;
            }
            db.transaction('s').objectStore('s').getAllKeys().onsuccess = function (event) {
                var result = (event.target.result) || null;
                callback(result);
            };
        },
        getAll: function (callback) {
            if (!db) {
                setTimeout(function () { ldb.getAll(callback); }, 50);
                return;
            }
            db.transaction('s').objectStore('s').getAll().onsuccess = function (event) {
                var result = (event.target.result) || null;
                callback(result);
            };
        },
        clear: function (callback) {
            if (!db) {
                setTimeout(function () { ldb.clear(callback); }, 50);
                return;
            }
            db.transaction('s', 'readwrite').objectStore('s').clear().onsuccess = function (event) {
                if (callback) callback();
            };
        },
    }
    const exported = {
        'get': ldb.get,
        'set': ldb.set,
        'delete': ldb.delete,
        'list': ldb.list,
        'getAll': ldb.getAll,
        'clear': ldb.clear,
    };
    win['ldb'] = exported
    if (typeof module !== 'undefined') {
        module.exports = exported;
    }
})();


(function () {
    let data = `
Adirondack Swimming|AD|Eastern
Alaska Swimming|AK|Western
Allegheny Mountain Swimming|AM|Eastern
Arkansas Swimming|AR|Central
Arizona Swimming|AZ|Western
Border Swimming|BD|Southern
Central California Swimming|CC|Western
Colorado Swimming|CO|Western
Connecticut Swimming|CT|Eastern
Florida Swimming|FL|Southern
Florida Gold Coast Swimming|FG|Southern
Georgia Swimming|GA|Southern
Gulf Swimming|GU|Southern
Hawaiian Swimming|HI|Western
Illinois Swimming|IL|Central
Indiana Swimming|IN|Central
Inland Empire Swimming|IE|Western
Iowa Swimming|IA|Central
Kentucky Swimming|KY|Southern
Lake Erie Swimming|LE|Central
Louisiana Swimming|LA|Southern
Maine Swimming|ME|Eastern
Maryland Swimming|MD|Eastern
Metropolitan Swimming|MR|Eastern
Michigan Swimming|MI|Central
Middle Atlantic Swimming|MA|Eastern
Midwestern Swimming|MW|Central
Minnesota Swimming|MN|Central
Mississippi Swimming|MS|Southern
Missouri Valley Swimming|MV|Central
Montana Swimming|MT|Western
New England Swimming|NE|Eastern
New Jersey Swimming|NJ|Eastern
New Mexico Swimming|NM|Western
Niagara Swimming|NI|Eastern
North Carolina Swimming|NC|Southern
North Dakota Swimming|ND|Central
North Texas Swimming|NT|Southern
Ohio Swimming|OH|Central
Oklahoma Swimming|OK|Central
Oregon Swimming|OR|Western
Ozark Swimming|OZ|Central
Pacific Swimming|PC|Western
Pacific Northwest Swimming|PN|Western
Potomac Valley Swimming|PV|Eastern
San Diego-Imperial Swimming|SI|Western
Sierra Nevada Swimming|SN|Western
Snake River Swimming|SR|Western
South Carolina Swimming|SC|Southern
South Dakota Swimming|SD|Central
South Texas Swimming|ST|Southern
Southeastern Swimming|SE|Southern
Southern California Swimming|CA|Western
Utah Swimming|UT|Western
Virginia Swimming|VA|Eastern
West Texas Swimming|WT|Southern
West Virginia Swimming|WV|Southern
Wisconsin Swimming|WI|Central
Wyoming Swimming|WY|Western`;
    let lines = data.split('\n');
    let map = new Map();
    for (let line of lines) {
        let parts = line.split('|');
        if (parts.length == 3) {
            map.set(parts[1], [parts[0], parts[2]]);
        }
    }
    window.lscMap = map;
    window.getLSCName = function (lsc) {
        return (map.get(lsc) || ['', ''])[0];
    }
    window.getLSCZone = function (lsc) {
        return (map.get(lsc) || ['', ''])[1];
    }
})();


(function () {
    let data = `
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 10 & under Girls Event 10 & under Boys
10U
39.79 35.99 32.09 30.89 29.59 28.29 50 FR SCY 27.49 28.69 29.89 31.09 34.59 38.19
1:30.79 1:21.09 1:11.49 1:08.29 1:04.99 1:01.79 100 FR SCY 1:00.69 1:03.79 1:06.79 1:09.79 1:18.89 1:27.99
3:22.79 3:00.59 2:38.39 2:30.99 2:23.59 2:16.19 200 FR SCY 2:12.69 2:18.99 2:25.29 2:31.59 2:50.59 3:09.49
8:36.69 7:45.09 6:53.39 6:36.19 6:18.99 6:01.69 500 FR SCY 5:52.99 6:09.79 6:26.59 6:43.39 7:33.79 8:24.29
48.59 43.29 37.99 36.19 34.39 32.59 50 BK SCY 32.19 33.99 35.79 37.59 42.89 48.29
1:45.79 1:33.99 1:22.29 1:18.39 1:14.49 1:10.59 100 BK SCY 1:08.99 1:12.49 1:16.09 1:19.59 1:30.09 1:40.69
54.59 48.69 42.79 40.89 38.89 36.89 50 BR SCY 36.39 38.29 40.19 42.09 47.69 53.39
2:00.29 1:46.89 1:33.59 1:29.09 1:24.69 1:20.19 100 BR SCY 1:18.79 1:22.69 1:26.59 1:30.59 1:42.29 1:54.09
48.39 42.69 36.99 35.09 33.19 31.29 50 FL SCY 30.79 32.59 34.29 35.99 41.29 46.49
1:56.69 1:41.39 1:26.09 1:20.99 1:15.99 1:10.89 100 FL SCY 1:09.79 1:14.59 1:19.49 1:24.39 1:38.99 1:53.49
1:44.29 1:33.19 1:22.09 1:18.39 1:14.69 1:10.99 100 IM SCY 1:09.79 1:13.09 1:16.39 1:19.69 1:29.69 1:39.69
3:42.09 3:18.79 2:55.49 2:47.69 2:39.99 2:32.19 200 IM SCY 2:30.89 2:38.39 2:45.89 2:53.49 3:15.99 3:38.59

# 2:53.19 2:35.89 2:18.59 2:12.79 2:06.99 2:01.19 200 FR-R SCY 2:00.19 2:05.89 2:11.59 2:17.29 2:34.49 2:51.69
# 3:14.99 2:55.49 2:35.99 2:29.49 2:22.99 2:16.49 200 MED-R SCY 2:15.39 2:21.79 2:28.29 2:34.69 2:53.99 3:13.39

# 11-12 Girls Event 11-12 Boys
11-12
33.99 31.69 29.29 28.09 26.99 25.79 50 FR SCY 24.59 25.79 26.99 28.09 30.49 32.79
1:14.69 1:09.39 1:03.99 1:01.39 58.69 55.99 100 FR SCY 53.59 56.19 58.69 1:01.29 1:06.39 1:11.49
2:42.59 2:30.89 2:19.29 2:13.49 2:07.69 2:01.89 200 FR SCY 1:56.99 2:02.59 2:08.19 2:13.69 2:24.89 2:35.99
7:16.89 6:45.69 6:14.49 5:58.89 5:43.29 5:27.69 500 FR SCY 5:14.99 5:29.99 5:44.99 5:59.99 6:29.99 6:59.89
15:02.69 13:58.19 12:53.79 12:21.49 11:49.29 11:16.99 1000 FR SCY 11:02.59 11:34.19 12:05.79 12:37.29 13:40.39 14:43.49
25:07.39 23:19.69 21:32.09 20:38.19 19:44.39 18:50.59 1650 FR SCY 18:20.79 19:13.19 20:05.59 20:58.09 22:42.89 24:27.69
38.79 35.99 33.19 31.79 30.49 29.09 50 BK SCY 28.19 29.69 31.19 32.69 35.59 38.49
1:26.59 1:19.79 1:12.99 1:09.59 1:06.19 1:02.69 100 BK SCY 59.49 1:02.79 1:05.99 1:09.29 1:15.69 1:22.19
2:59.49 2:46.69 2:33.89 2:27.49 2:20.99 2:14.59 200 BK SCY 2:09.69 2:15.89 2:21.99 2:28.19 2:40.49 2:52.89
43.99 40.89 37.69 36.19 34.59 32.99 50 BR SCY 31.49 33.29 34.99 36.69 40.09 43.49
1:36.49 1:29.29 1:22.19 1:18.59 1:15.09 1:11.49 100 BR SCY 1:07.79 1:11.39 1:14.89 1:18.39 1:25.49 1:32.59
3:25.69 3:10.99 2:56.29 2:48.99 2:41.69 2:34.29 200 BR SCY 2:27.29 2:34.39 2:41.39 2:48.39 3:02.39 3:16.39
36.89 34.29 31.59 30.29 28.99 27.69 50 FL SCY 26.69 28.19 29.69 31.19 34.19 37.09
1:25.79 1:18.89 1:12.09 1:08.59 1:05.19 1:01.79 100 FL SCY 59.09 1:02.49 1:05.89 1:09.29 1:16.09 1:22.89
3:03.39 2:50.29 2:37.19 2:30.59 2:24.09 2:17.59 200 FL SCY 2:12.39 2:18.69 2:24.99 2:31.39 2:43.99 2:56.59
1:25.19 1:19.09 1:13.09 1:09.99 1:06.99 1:03.89 100 IM SCY 1:01.09 1:03.99 1:06.99 1:09.99 1:15.89 1:21.89
3:03.89 2:50.69 2:37.59 2:30.99 2:24.49 2:17.89 200 IM SCY 2:12.09 2:18.79 2:25.59 2:32.29 2:45.79 2:59.29
6:31.69 6:03.69 5:35.79 5:21.79 5:07.79 4:53.79 400 IM SCY 4:42.79 4:56.29 5:09.79 5:23.19 5:50.09 6:17.09

# 2:24.79 2:14.39 2:04.09 1:58.89 1:53.79 1:48.59 200 FR-R SCY 1:44.39 1:49.29 1:54.29 1:59.29 2:09.19 2:19.09
# 5:18.09 4:55.39 4:32.69 4:21.29 4:09.99 3:58.59 400 FR-R SCY 3:50.09 4:00.99 4:11.99 4:22.89 4:44.79 5:06.79
# 2:41.19 2:29.69 2:18.19 2:12.39 2:06.69 2:00.89 200 MED-R SCY 1:55.59 2:01.09 2:06.59 2:12.09 2:23.09 2:34.09
# 5:53.49 5:28.29 5:02.99 4:50.39 4:37.79 4:25.09 400 MED-R SCY 4:14.79 4:26.99 4:39.09 4:51.19 5:15.49 5:39.79

# Page 1 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 13-14 Girls Event 13-14 Boys
13-14
32.49 30.19 27.89 26.69 25.59 24.39 50 FR SCY 22.39 23.49 24.59 25.59 27.69 29.89
1:10.99 1:05.89 1:00.89 58.29 55.79 53.29 100 FR SCY 48.69 51.09 53.39 55.69 1:00.29 1:04.99
2:33.59 2:22.69 2:11.69 2:06.19 2:00.69 1:55.29 200 FR SCY 1:46.89 1:51.99 1:57.09 2:02.19 2:12.29 2:22.49
6:52.19 6:22.79 5:53.39 5:38.59 5:23.89 5:09.19 500 FR SCY 4:49.29 5:03.09 5:16.89 5:30.59 5:58.19 6:25.69
14:11.09 13:10.29 12:09.49 11:39.09 11:08.69 10:38.29 1000 FR SCY 9:58.49 10:26.99 10:55.49 11:23.99 12:20.99 13:17.99
23:42.89 22:01.19 20:19.59 19:28.79 18:37.99 17:47.19 1650 FR SCY 16:47.19 17:35.19 18:23.09 19:11.09 20:46.99 22:22.89
1:16.89 1:11.39 1:05.89 1:03.19 1:00.49 57.69 100 BK SCY 53.49 55.99 58.59 1:01.09 1:06.19 1:11.29
2:46.39 2:34.49 2:22.59 2:16.69 2:10.69 2:04.79 200 BK SCY 1:55.99 2:01.59 2:07.09 2:12.59 2:23.69 2:34.69
1:28.69 1:22.29 1:15.99 1:12.89 1:09.69 1:06.49 100 BR SCY 1:00.39 1:03.29 1:06.19 1:08.99 1:14.79 1:20.49
3:10.99 2:57.39 2:43.79 2:36.89 2:30.09 2:23.29 200 BR SCY 2:11.19 2:17.39 2:23.59 2:29.89 2:42.39 2:54.89
1:16.79 1:11.29 1:05.89 1:03.09 1:00.39 57.59 100 FL SCY 52.89 55.39 57.89 1:00.39 1:05.49 1:10.49
2:51.19 2:38.99 2:26.69 2:20.59 2:14.49 2:08.39 200 FL SCY 1:57.59 2:03.19 2:08.79 2:14.39 2:25.59 2:36.79
2:51.79 2:39.49 2:27.19 2:21.09 2:14.99 2:08.79 200 IM SCY 1:58.49 2:04.09 2:09.79 2:15.39 2:26.69 2:37.99
6:05.79 5:39.69 5:13.49 5:00.49 4:47.39 4:34.29 400 IM SCY 4:13.29 4:25.39 4:37.39 4:49.49 5:13.59 5:37.69

# 2:16.29 2:06.59 1:56.89 1:51.99 1:47.09 1:42.29 200 FR-R SCY 1:33.69 1:38.19 1:42.59 1:47.09 1:55.99 2:04.89
# 4:57.29 4:35.99 4:14.79 4:04.19 3:53.59 3:42.99 400 FR-R SCY 3:24.89 3:34.59 3:44.39 3:54.19 4:13.69 4:33.19
# 10:49.19 10:02.79 9:16.39 8:53.29 8:30.09 8:06.89 800 FR-R SCY 7:33.29 7:54.89 8:16.39 8:37.99 9:21.19 10:04.39
# 2:29.89 2:19.19 2:08.49 2:03.09 1:57.79 1:52.39 200 MED-R SCY 1:43.69 1:48.59 1:53.59 1:58.49 2:08.39 2:18.19
# 5:26.89 5:03.59 4:40.19 4:28.59 4:16.89 4:05.19 400 MED-R SCY 3:44.49 3:55.19 4:05.89 4:16.49 4:37.89 4:59.29

# 15-16 Girls Event 15-16 Boys
15-16
31.79 29.49 27.29 26.09 24.99 23.89 50 FR SCY 21.19 22.19 23.19 24.19 26.29 28.29
1:08.79 1:03.79 58.89 56.49 53.99 51.59 100 FR SCY 46.49 48.79 50.99 53.19 57.59 1:01.99
2:28.99 2:18.39 2:07.69 2:02.39 1:57.09 1:51.79 200 FR SCY 1:41.99 1:46.89 1:51.79 1:56.59 2:06.29 2:15.99
6:40.99 6:12.39 5:43.69 5:29.39 5:15.09 5:00.79 500 FR SCY 4:36.29 4:49.49 5:02.69 5:15.79 5:42.09 6:08.39
13:52.89 12:53.49 11:53.99 11:24.19 10:54.49 10:24.69 1000 FR SCY 9:38.89 10:06.39 10:33.99 11:01.59 11:56.69 12:51.79
23:15.89 21:36.19 19:56.49 19:06.69 18:16.79 17:26.89 1650 FR SCY 16:04.99 16:50.89 17:36.89 18:22.79 19:54.69 21:26.59
1:14.69 1:09.39 1:04.09 1:01.39 58.69 56.09 100 BK SCY 50.69 53.09 55.49 57.89 1:02.69 1:07.49
2:42.19 2:30.59 2:19.09 2:13.29 2:07.49 2:01.69 200 BK SCY 1:50.69 1:55.99 2:01.29 2:06.59 2:17.09 2:27.59
1:25.89 1:19.79 1:13.69 1:10.59 1:07.49 1:04.49 100 BR SCY 57.69 1:00.39 1:03.19 1:05.89 1:11.39 1:16.89
3:05.99 2:52.69 2:39.39 2:32.79 2:26.19 2:19.49 200 BR SCY 2:05.29 2:11.29 2:17.29 2:23.19 2:35.19 2:47.09
1:14.39 1:09.09 1:03.79 1:01.09 58.39 55.79 100 FL SCY 50.39 52.79 55.19 57.59 1:02.39 1:07.19
2:45.79 2:33.99 2:22.09 2:16.19 2:10.29 2:04.39 200 FL SCY 1:52.69 1:58.09 2:03.39 2:08.79 2:19.49 2:30.19
2:46.19 2:34.29 2:22.39 2:16.49 2:10.59 2:04.59 200 IM SCY 1:53.19 1:58.59 2:03.99 2:09.39 2:20.19 2:30.89
5:54.99 5:29.69 5:04.29 4:51.59 4:38.99 4:26.29 400 IM SCY 4:01.59 4:13.19 4:24.69 4:36.19 4:59.19 5:22.19

# 2:15.19 2:05.59 1:55.89 1:51.09 1:46.29 1:41.39 200 FR-R SCY 1:31.39 1:35.69 1:40.09 1:44.39 1:53.09 2:01.79
# 4:54.89 4:33.79 4:12.79 4:02.29 3:51.69 3:41.19 400 FR-R SCY 3:21.59 3:31.19 3:40.79 3:50.39 4:09.59 4:28.79
# 10:47.79 10:01.59 9:15.29 8:52.19 8:28.99 8:05.89 800 FR-R SCY 7:27.79 7:49.09 8:10.39 8:31.79 9:14.39 9:57.09
# 2:28.09 2:17.49 2:06.99 2:01.69 1:56.39 1:51.09 200 MED-R SCY 1:40.69 1:45.49 1:50.19 1:54.99 2:04.59 2:14.19
# 5:23.29 5:00.19 4:37.09 4:25.59 4:13.99 4:02.49 400 MED-R SCY 3:40.69 3:51.19 4:01.69 4:12.19 4:33.19 4:54.19

# Page 2 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 17-18 Girls Event 17-18 Boys
17-18
31.39 29.09 26.89 25.79 24.69 23.49 50 FR SCY 20.69 21.69 22.59 23.59 25.59 27.59
1:08.09 1:03.19 58.39 55.89 53.49 51.09 100 FR SCY 45.29 47.39 49.59 51.69 55.99 1:00.29
2:27.19 2:16.69 2:06.19 2:00.89 1:55.69 1:50.39 200 FR SCY 1:40.19 1:44.99 1:49.69 1:54.49 2:03.99 2:13.59
6:36.49 6:08.19 5:39.89 5:25.69 5:11.59 4:57.39 500 FR SCY 4:32.39 4:45.39 4:58.39 5:11.39 5:37.29 6:03.19
13:46.09 12:47.09 11:48.09 11:18.59 10:49.09 10:19.59 1000 FR SCY 9:30.19 9:57.29 10:24.49 10:51.59 11:45.89 12:40.19
22:47.19 21:09.59 19:31.89 18:43.09 17:54.29 17:05.39 1650 FR SCY 15:51.79 16:37.09 17:22.39 18:07.69 19:38.39 21:08.99
1:13.39 1:08.09 1:02.89 1:00.29 57.69 54.99 100 BK SCY 48.89 51.29 53.59 55.89 1:00.59 1:05.19
2:38.79 2:27.39 2:16.09 2:10.39 2:04.79 1:59.09 200 BK SCY 1:47.89 1:53.09 1:58.19 2:03.29 2:13.59 2:23.89
1:24.79 1:18.79 1:12.69 1:09.69 1:06.69 1:03.59 100 BR SCY 55.99 58.69 1:01.39 1:03.99 1:09.39 1:14.69
3:04.69 2:51.49 2:38.29 2:31.69 2:25.09 2:18.49 200 BR SCY 2:01.69 2:07.49 2:13.29 2:19.09 2:30.69 2:42.29
1:13.59 1:08.29 1:03.09 1:00.39 57.79 55.19 100 FL SCY 49.09 51.39 53.69 56.09 1:00.79 1:05.39
2:42.79 2:31.19 2:19.49 2:13.69 2:07.89 2:02.09 200 FL SCY 1:49.79 1:55.09 2:00.29 2:05.49 2:15.99 2:26.39
2:43.59 2:31.89 2:20.19 2:14.39 2:08.49 2:02.69 200 IM SCY 1:50.59 1:55.89 2:01.09 2:06.39 2:16.89 2:27.39
5:50.69 5:25.59 5:00.59 4:47.99 4:35.49 4:22.99 400 IM SCY 3:57.99 4:09.39 4:20.69 4:31.99 4:54.69 5:17.39

# 2:14.69 2:05.09 1:55.39 1:50.59 1:45.79 1:40.99 200 FR-R SCY 1:26.69 1:30.79 1:34.89 1:39.09 1:47.29 1:55.59
# 4:49.49 4:28.79 4:08.19 3:57.79 3:47.49 3:37.19 400 FR-R SCY 3:10.39 3:19.39 3:28.49 3:37.49 3:55.69 4:13.79
# 10:32.29 9:47.19 9:01.99 8:39.39 8:16.79 7:54.29 800 FR-R SCY 7:02.99 7:23.09 7:43.19 8:03.39 8:43.69 9:23.89
# 2:26.89 2:16.39 2:05.89 2:00.69 1:55.39 1:50.19 200 MED-R SCY 1:34.69 1:39.19 1:43.69 1:48.19 1:57.19 2:06.29
# 5:20.29 4:57.39 4:34.49 4:23.09 4:11.69 4:00.19 400 MED-R SCY 3:27.59 3:37.49 3:47.39 3:57.29 4:17.09 4:36.79

# 10 & under Girls Event 10 & under Boys
10U
43.99 39.79 35.49 34.09 32.69 31.29 50 FR SCM 30.39 31.69 32.99 34.29 38.19 42.19
1:40.29 1:29.69 1:18.99 1:15.39 1:11.89 1:08.29 100 FR SCM 1:07.09 1:10.39 1:13.79 1:17.09 1:27.19 1:37.19
3:43.99 3:19.49 2:54.99 2:46.79 2:38.59 2:30.39 200 FR SCM 2:26.59 2:33.59 2:40.59 2:47.49 3:08.49 3:29.39
7:32.19 6:46.89 6:01.69 5:46.69 5:31.59 5:16.49 400 FR SCM 5:08.89 5:23.59 5:38.29 5:52.99 6:37.09 7:21.19
53.69 47.79 41.89 39.99 37.99 36.09 50 BK SCM 35.59 37.59 39.59 41.49 47.39 53.39
1:56.89 1:43.89 1:30.89 1:26.59 1:22.29 1:17.99 100 BK SCM 1:16.29 1:20.09 1:23.99 1:27.89 1:39.59 1:51.19
1:00.29 53.79 47.29 45.09 42.99 40.79 50 BR SCM 40.19 42.29 44.39 46.49 52.79 58.99
2:12.89 1:58.19 1:43.39 1:38.49 1:33.59 1:28.69 100 BR SCM 1:26.99 1:31.39 1:35.69 1:40.09 1:53.09 2:06.09
53.49 47.19 40.89 38.79 36.69 34.59 50 FL SCM 33.99 35.99 37.89 39.79 45.59 51.39
2:08.89 1:52.09 1:35.19 1:29.49 1:23.89 1:18.29 100 FL SCM 1:17.09 1:22.49 1:27.79 1:33.19 1:49.29 2:05.49
1:55.19 1:42.99 1:30.69 1:26.59 1:22.49 1:18.39 100 IM SCM 1:17.09 1:20.79 1:24.39 1:28.09 1:39.09 1:50.09
4:05.39 3:39.59 3:13.89 3:05.29 2:56.79 2:48.19 200 IM SCM 2:46.69 2:55.09 3:03.39 3:11.69 3:36.59 4:01.59

# 3:11.39 2:52.19 2:33.09 2:26.69 2:20.29 2:13.99 200 FR-R SCM 2:12.79 2:19.09 2:25.39 2:31.69 2:50.69 3:09.69
# 3:35.49 3:13.89 2:52.39 2:45.19 2:37.99 2:30.79 200 MED-R SCM 2:29.59 2:36.69 2:43.79 2:50.89 3:12.29 3:33.69

# Page 3 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 11-12 Girls Event 11-12 Boys
11-12
37.59 34.99 32.39 31.09 29.79 28.49 50 FR SCM 27.19 28.49 29.79 31.09 33.69 36.29
1:22.49 1:16.59 1:10.69 1:07.79 1:04.89 1:01.89 100 FR SCM 59.19 1:02.09 1:04.89 1:07.69 1:13.29 1:18.99
2:59.59 2:46.79 2:33.99 2:27.59 2:21.09 2:14.69 200 FR SCM 2:09.29 2:15.49 2:21.59 2:27.79 2:40.09 2:52.39
6:22.29 5:54.99 5:27.69 5:14.09 5:00.39 4:46.79 400 FR SCM 4:35.59 4:48.69 5:01.79 5:14.99 5:41.19 6:07.49
13:09.89 12:13.49 11:16.99 10:48.79 10:20.59 9:52.39 800 FR SCM 9:39.79 10:07.39 10:34.99 11:02.59 11:57.89 12:53.09
24:58.39 23:11.29 21:24.29 20:30.79 19:37.29 18:43.79 1500 FR SCM 18:14.19 19:06.29 19:58.39 20:50.49 22:34.69 24:18.89
42.79 39.79 36.69 35.19 33.59 32.09 50 BK SCM 31.19 32.79 34.49 36.09 39.29 42.59
1:35.69 1:28.19 1:20.59 1:16.89 1:13.09 1:09.29 100 BK SCM 1:05.79 1:09.39 1:12.89 1:16.49 1:23.69 1:30.79
3:18.29 3:04.19 2:49.99 2:42.89 2:35.79 2:28.79 200 BK SCM 2:23.29 2:30.09 2:36.89 2:43.69 2:57.39 3:10.99
48.59 45.19 41.69 39.89 38.19 36.49 50 BR SCM 34.89 36.69 38.59 40.49 44.29 48.09
1:46.59 1:38.69 1:30.79 1:26.89 1:22.99 1:18.99 100 BR SCM 1:14.99 1:18.89 1:22.79 1:26.69 1:34.49 1:42.29
3:47.29 3:31.09 3:14.89 3:06.69 2:58.59 2:50.49 200 BR SCM 2:42.79 2:50.59 2:58.29 3:06.09 3:21.59 3:37.09
40.79 37.79 34.89 33.49 31.99 30.59 50 FL SCM 29.59 31.19 32.79 34.49 37.69 40.99
1:34.79 1:27.19 1:19.59 1:15.79 1:12.09 1:08.29 100 FL SCM 1:05.29 1:08.99 1:12.79 1:16.49 1:24.09 1:31.59
3:22.59 3:08.19 2:53.69 2:46.49 2:39.19 2:31.99 200 FL SCM 2:26.29 2:33.29 2:40.29 2:47.19 3:01.19 3:15.09
1:34.19 1:27.49 1:20.69 1:17.39 1:13.99 1:10.59 100 IM SCM 1:07.49 1:10.69 1:13.99 1:17.29 1:23.89 1:30.49
3:23.19 3:08.69 2:54.19 2:46.89 2:39.59 2:32.39 200 IM SCM 2:25.99 2:33.39 2:40.89 2:48.29 3:03.19 3:18.09
7:12.79 6:41.89 6:10.99 5:55.59 5:40.09 5:24.59 400 IM SCM 5:12.49 5:27.39 5:42.29 5:57.19 6:26.89 6:56.69

# 2:39.89 2:28.49 2:17.09 2:11.39 2:05.69 1:59.99 200 FR-R SCM 1:55.29 2:00.79 2:06.29 2:11.79 2:22.79 2:33.69
# 5:51.59 5:26.39 5:01.29 4:48.79 4:36.19 4:23.69 400 FR-R SCM 4:14.19 4:26.29 4:38.39 4:50.49 5:14.69 5:38.99
# 2:58.09 2:45.39 2:32.69 2:26.29 2:19.89 2:13.59 200 MED-R SCM 2:07.79 2:13.79 2:19.89 2:25.99 2:38.19 2:50.29
# 6:30.59 6:02.69 5:34.79 5:20.89 5:06.89 4:52.99 400 MED-R SCM 4:41.59 4:54.99 5:08.39 5:21.79 5:48.59 6:15.39

# 13-14 Girls Event 13-14 Boys
13-14
35.99 33.39 30.79 29.49 28.29 26.99 50 FR SCM 24.79 25.89 27.09 28.29 30.69 32.99
1:18.49 1:12.89 1:07.29 1:04.49 1:01.69 58.89 100 FR SCM 53.89 56.39 58.99 1:01.49 1:06.69 1:11.79
2:49.79 2:37.69 2:25.49 2:19.49 2:13.39 2:07.29 200 FR SCM 1:58.09 2:03.69 2:09.39 2:14.99 2:26.19 2:37.49
6:00.69 5:34.99 5:09.19 4:56.29 4:43.39 4:30.59 400 FR SCM 4:13.19 4:25.19 4:37.29 4:49.29 5:13.39 5:37.49
12:24.69 11:31.49 10:38.29 10:11.69 9:45.09 9:18.49 800 FR SCM 8:43.69 9:08.59 9:33.59 9:58.49 10:48.39 11:38.19
23:34.29 21:53.29 20:12.29 19:21.79 18:31.29 17:40.79 1500 FR SCM 16:41.19 17:28.79 18:16.49 19:04.19 20:39.49 22:14.89
1:24.99 1:18.89 1:12.89 1:09.79 1:06.79 1:03.79 100 BK SCM 59.09 1:01.89 1:04.69 1:07.49 1:13.09 1:18.79
3:03.89 2:50.69 2:37.59 2:30.99 2:24.49 2:17.89 200 BK SCM 2:08.19 2:14.29 2:20.39 2:26.49 2:38.69 2:50.99
1:37.99 1:30.99 1:23.99 1:20.49 1:16.99 1:13.49 100 BR SCM 1:06.79 1:09.89 1:13.09 1:16.29 1:22.59 1:28.99
3:31.09 3:15.99 3:00.89 2:53.39 2:45.89 2:38.29 200 BR SCM 2:24.89 2:31.79 2:38.69 2:45.59 2:59.39 3:13.19
1:24.89 1:18.79 1:12.79 1:09.69 1:06.69 1:03.69 100 FL SCM 58.39 1:01.19 1:03.99 1:06.79 1:12.29 1:17.89
3:09.19 2:55.69 2:42.19 2:35.39 2:28.59 2:21.89 200 FL SCM 2:09.99 2:16.19 2:22.39 2:28.49 2:40.89 2:53.29
3:09.79 2:56.19 2:42.69 2:35.89 2:29.09 2:22.39 200 IM SCM 2:10.89 2:17.09 2:23.39 2:29.59 2:42.09 2:54.49
6:44.19 6:15.29 5:46.39 5:31.99 5:17.59 5:03.09 400 IM SCM 4:39.89 4:53.19 5:06.49 5:19.89 5:46.49 6:13.19

# 2:30.59 2:19.89 2:09.09 2:03.69 1:58.39 1:52.99 200 FR-R SCM 1:43.59 1:48.49 1:53.39 1:58.39 2:08.19 2:18.09
# 5:28.49 5:04.99 4:41.59 4:29.79 4:18.09 4:06.39 400 FR-R SCM 3:46.39 3:57.19 4:07.89 4:18.69 4:40.29 5:01.79
# 11:57.29 11:06.09 10:14.89 9:49.19 9:23.59 8:57.99 800 FR-R SCM 8:20.89 8:44.69 9:08.59 9:32.39 10:20.09 11:07.79
# 2:45.59 2:33.79 2:21.89 2:15.99 2:10.09 2:04.19 200 MED-R SCM 1:54.59 1:59.99 2:05.49 2:10.89 2:21.79 2:32.69
# 6:01.29 5:35.49 5:09.69 4:56.79 4:43.89 4:30.99 400 MED-R SCM 4:07.99 4:19.89 4:31.69 4:43.49 5:07.09 5:30.69

# Page 4 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 15-16 Girls Event 15-16 Boys
15-16
35.09 32.59 30.09 28.89 27.59 26.39 50 FR SCM 23.39 24.59 25.69 26.79 28.99 31.19
1:15.99 1:10.49 1:05.09 1:02.39 59.69 56.99 100 FR SCM 51.39 53.89 56.29 58.79 1:03.69 1:08.49
2:44.69 2:32.89 2:21.19 2:15.29 2:09.39 2:03.49 200 FR SCM 1:52.79 1:58.09 2:03.49 2:08.89 2:19.59 2:30.29
5:50.89 5:25.79 5:00.79 4:48.19 4:35.69 4:23.19 400 FR SCM 4:01.79 4:13.29 4:24.79 4:36.29 4:59.39 5:22.39
12:08.79 11:16.79 10:24.69 9:58.69 9:32.69 9:06.59 800 FR SCM 8:26.49 8:50.59 9:14.79 9:38.89 10:27.09 11:15.29
23:07.49 21:28.39 19:49.29 18:59.79 18:10.19 17:20.69 1500 FR SCM 15:59.19 16:44.89 17:30.49 18:16.19 19:47.59 21:18.89
1:22.59 1:16.69 1:10.79 1:07.79 1:04.89 1:01.99 100 BK SCM 55.99 58.59 1:01.29 1:03.99 1:09.29 1:14.59
2:59.29 2:46.49 2:33.69 2:27.29 2:20.89 2:14.49 200 BK SCM 2:02.39 2:08.19 2:13.99 2:19.79 2:31.49 2:43.09
1:34.99 1:28.19 1:21.39 1:17.99 1:14.59 1:11.19 100 BR SCM 1:03.69 1:06.79 1:09.79 1:12.79 1:18.89 1:24.99
3:25.49 3:10.89 2:56.19 2:48.79 2:41.49 2:34.19 200 BR SCM 2:18.49 2:25.09 2:31.69 2:38.29 2:51.39 3:04.59
1:22.19 1:16.29 1:10.39 1:07.49 1:04.59 1:01.59 100 FL SCM 55.69 58.39 1:00.99 1:03.69 1:08.99 1:14.29
3:03.19 2:50.09 2:37.09 2:30.49 2:23.99 2:17.39 200 FL SCM 2:04.49 2:10.39 2:16.39 2:22.29 2:34.19 2:45.99
3:03.59 2:50.49 2:37.39 2:30.79 2:24.29 2:17.69 200 IM SCM 2:05.09 2:11.09 2:16.99 2:22.99 2:34.89 2:46.79
6:32.29 6:04.29 5:36.29 5:22.29 5:08.19 4:54.19 400 IM SCM 4:26.99 4:39.69 4:52.39 5:05.19 5:30.59 5:55.99

# 2:29.39 2:18.79 2:08.09 2:02.79 1:57.39 1:52.09 200 FR-R SCM 1:40.99 1:45.79 1:50.59 1:55.39 2:04.99 2:14.59
# 5:25.89 5:02.59 4:39.29 4:27.69 4:15.99 4:04.39 400 FR-R SCM 3:42.79 3:53.39 4:03.99 4:14.59 4:35.79 4:57.09
# 11:55.79 11:04.69 10:13.59 9:47.99 9:22.49 8:56.89 800 FR-R SCM 8:14.79 8:38.39 9:01.89 9:25.49 10:12.59 10:59.69
# 2:43.59 2:31.99 2:20.29 2:14.39 2:08.59 2:02.69 200 MED-R SCM 1:51.19 1:56.49 2:01.79 2:07.09 2:17.69 2:28.29
# 5:57.19 5:31.69 5:06.19 4:53.39 4:40.69 4:27.89 400 MED-R SCM 4:03.79 4:15.39 4:27.09 4:38.69 5:01.89 5:25.09

# 17-18 Girls Event 17-18 Boys
17-18
34.69 32.19 29.69 28.49 27.19 25.99 50 FR SCM 22.79 23.89 24.99 26.09 28.29 30.39
1:15.19 1:09.89 1:04.49 1:01.79 59.09 56.39 100 FR SCM 49.99 52.39 54.79 57.19 1:01.89 1:06.69
2:42.69 2:31.09 2:19.39 2:13.59 2:07.79 2:01.99 200 FR SCM 1:50.69 1:55.99 2:01.29 2:06.49 2:17.09 2:27.59
5:46.89 5:22.19 4:57.39 4:44.99 4:32.59 4:20.19 400 FR SCM 3:58.39 4:09.69 4:21.09 4:32.39 4:55.09 5:17.79
12:02.79 11:11.19 10:19.59 9:53.69 9:27.89 9:02.09 800 FR SCM 8:18.89 8:42.69 9:06.39 9:30.19 10:17.69 11:05.19
22:38.99 21:01.99 19:24.89 18:36.39 17:47.79 16:59.29 1500 FR SCM 15:46.09 16:31.09 17:16.19 18:01.19 19:31.29 21:01.39
1:21.09 1:15.29 1:09.49 1:06.59 1:03.69 1:00.79 100 BK SCM 54.09 56.59 59.19 1:01.79 1:06.89 1:12.09
2:55.39 2:42.89 2:30.39 2:24.09 2:17.79 2:11.59 200 BK SCM 1:59.29 2:04.89 2:10.59 2:16.29 2:27.59 2:38.99
1:33.69 1:27.09 1:20.39 1:16.99 1:13.69 1:10.29 100 BR SCM 1:01.89 1:04.89 1:07.79 1:10.69 1:16.59 1:22.49
3:24.09 3:09.49 2:54.89 2:47.59 2:40.39 2:33.09 200 BR SCM 2:14.49 2:20.89 2:27.29 2:33.69 2:46.49 2:59.29
1:21.29 1:15.49 1:09.69 1:06.79 1:03.89 1:00.99 100 FL SCM 54.19 56.79 59.39 1:01.99 1:07.09 1:12.29
2:59.89 2:46.99 2:34.19 2:27.69 2:21.29 2:14.89 200 FL SCM 2:01.39 2:07.09 2:12.89 2:18.69 2:30.19 2:41.79
3:00.69 2:47.79 2:34.89 2:28.49 2:21.99 2:15.59 200 IM SCM 2:02.19 2:07.99 2:13.79 2:19.59 2:31.29 2:42.89
6:27.49 5:59.79 5:32.09 5:18.29 5:04.49 4:50.59 400 IM SCM 4:22.99 4:35.49 4:48.09 5:00.59 5:25.59 5:50.69

# 2:28.79 2:18.19 2:07.59 2:02.29 1:56.89 1:51.59 200 FR-R SCM 1:35.79 1:40.29 1:44.89 1:49.49 1:58.59 2:07.69
# 5:19.89 4:57.09 4:34.19 4:22.79 4:11.39 3:59.89 400 FR-R SCM 3:30.29 3:40.39 3:50.39 4:00.39 4:20.39 4:40.39
# 11:38.69 10:48.79 9:58.89 9:33.99 9:08.99 8:43.99 800 FR-R SCM 7:47.39 8:09.59 8:31.89 8:54.09 9:38.59 10:23.09
# 2:42.29 2:30.69 2:19.09 2:13.29 2:07.49 2:01.69 200 MED-R SCM 1:44.59 1:49.59 1:54.59 1:59.59 2:09.49 2:19.49
# 5:53.89 5:28.59 5:03.39 4:50.69 4:38.09 4:25.39 400 MED-R SCM 3:49.39 4:00.39 4:11.29 4:22.19 4:44.09 5:05.89

# Page 5 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 10 & under Girls Event 10 & under Boys
10U
45.29 40.89 36.59 35.09 33.69 32.19 50 FR LCM 31.59 32.99 34.39 35.69 39.79 43.89
1:44.09 1:32.99 1:21.89 1:18.19 1:14.49 1:10.79 100 FR LCM 1:09.79 1:13.19 1:16.69 1:20.19 1:30.59 1:40.99
3:50.99 3:25.69 3:00.39 2:51.99 2:43.49 2:35.09 200 FR LCM 2:31.69 2:38.89 2:46.09 2:53.39 3:14.99 3:36.69
7:48.59 7:01.69 6:14.89 5:59.29 5:43.69 5:27.99 400 FR LCM 5:20.79 5:36.09 5:51.39 6:06.59 6:52.49 7:38.29
55.79 49.69 43.59 41.59 39.49 37.49 50 BK LCM 36.99 38.99 41.09 43.09 49.29 55.39
2:01.59 1:48.09 1:34.59 1:30.09 1:25.59 1:21.09 100 BK LCM 1:19.99 1:24.09 1:28.19 1:32.29 1:44.49 1:56.69
1:02.19 55.49 48.79 46.49 44.29 42.09 50 BR LCM 41.49 43.59 45.79 47.89 54.39 1:00.89
2:19.39 2:03.89 1:48.39 1:43.29 1:38.09 1:32.99 100 BR LCM 1:31.69 1:36.29 1:40.89 1:45.49 1:59.19 2:12.89
54.49 48.09 41.59 39.49 37.29 35.19 50 FL LCM 34.69 36.59 38.59 40.59 46.39 52.29
2:12.79 1:55.39 1:37.99 1:32.19 1:26.39 1:20.59 100 FL LCM 1:19.59 1:25.09 1:30.69 1:36.19 1:52.89 2:09.49
4:15.69 3:48.89 3:22.09 3:13.09 3:04.19 2:55.29 200 IM LCM 2:52.19 3:00.79 3:09.39 3:17.89 3:43.69 4:09.49

# 3:17.49 2:57.79 2:37.99 2:31.39 2:24.79 2:18.29 200 FR-R LCM 2:17.19 2:23.69 2:30.19 2:36.79 2:56.39 3:15.89
# 3:43.59 3:21.19 2:58.89 2:51.39 2:43.99 2:36.49 200 MED-R LCM 2:37.59 2:45.09 2:52.59 3:00.09 3:22.59 3:45.09

# 11-12 Girls Event 11-12 Boys
11-12
38.49 35.89 33.19 31.89 30.49 29.19 50 FR LCM 28.09 29.39 30.69 32.09 34.79 37.39
1:25.59 1:19.49 1:13.39 1:10.29 1:07.19 1:04.19 100 FR LCM 1:01.59 1:04.49 1:07.49 1:10.39 1:16.19 1:22.09
3:06.39 2:53.09 2:39.79 2:33.09 2:26.49 2:19.79 200 FR LCM 2:14.39 2:20.79 2:27.19 2:33.59 2:46.39 2:59.19
6:32.89 6:04.79 5:36.79 5:22.79 5:08.69 4:54.69 400 FR LCM 4:45.89 4:59.49 5:13.09 5:26.69 5:53.89 6:21.09
13:41.59 12:42.89 11:44.19 11:14.89 10:45.49 10:16.19 800 FR LCM 10:00.09 10:28.69 10:57.29 11:25.89 12:22.99 13:20.19
26:06.89 24:14.99 22:22.99 21:27.09 20:31.09 19:35.19 1500 FR LCM 19:23.89 20:19.29 21:14.69 22:10.19 24:00.99 25:51.79
44.79 41.59 38.39 36.79 35.19 33.59 50 BK LCM 32.59 34.29 35.99 37.69 41.09 44.49
1:40.59 1:32.69 1:24.79 1:20.79 1:16.89 1:12.89 100 BK LCM 1:10.39 1:14.29 1:18.09 1:21.89 1:29.59 1:37.19
3:28.09 3:13.29 2:58.39 2:50.99 2:43.49 2:36.09 200 BK LCM 2:32.19 2:39.49 2:46.69 2:53.99 3:08.49 3:22.99
49.79 46.19 42.69 40.89 39.09 37.39 50 BR LCM 36.09 38.09 39.99 41.99 45.89 49.79
1:50.39 1:42.19 1:33.99 1:29.99 1:25.89 1:21.79 100 BR LCM 1:18.99 1:23.09 1:27.19 1:31.29 1:39.59 1:47.79
3:56.79 3:39.89 3:22.99 3:14.49 3:06.09 2:57.59 200 BR LCM 2:50.99 2:59.09 3:07.19 3:15.39 3:31.59 3:47.89
41.79 38.79 35.79 34.29 32.89 31.39 50 FL LCM 30.29 31.99 33.59 35.29 38.69 41.99
1:38.29 1:30.49 1:22.59 1:18.69 1:14.79 1:10.79 100 FL LCM 1:07.79 1:11.69 1:15.59 1:19.49 1:27.29 1:35.09
3:31.09 3:15.99 3:00.89 2:53.39 2:45.89 2:38.29 200 FL LCM 2:33.59 2:40.89 2:48.29 2:55.59 3:10.19 3:24.79
3:30.59 3:15.59 3:00.59 2:52.99 2:45.49 2:37.99 200 IM LCM 2:30.59 2:38.29 2:45.99 2:53.69 3:08.99 3:24.39
7:28.89 6:56.79 6:24.79 6:08.69 5:52.69 5:36.69 400 IM LCM 5:28.39 5:44.09 5:59.69 6:15.39 6:46.59 7:17.89

# 2:44.29 2:32.59 2:20.89 2:14.99 2:09.09 2:03.29 200 FR-R LCM 2:00.19 2:05.89 2:11.59 2:17.39 2:28.79 2:40.19
# 6:03.69 5:37.69 5:11.79 4:58.79 4:45.79 4:32.79 400 FR-R LCM 4:26.79 4:39.49 4:52.19 5:04.89 5:30.29 5:55.69
# 3:04.19 2:50.99 2:37.89 2:31.29 2:24.69 2:18.19 200 MED-R LCM 2:14.79 2:21.29 2:27.69 2:34.09 2:46.89 2:59.79
# 6:48.79 6:19.59 5:50.39 5:35.79 5:21.19 5:06.59 400 MED-R LCM 4:59.69 5:13.99 5:28.19 5:42.49 6:10.99 6:39.59

# Page 6 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 13-14 Girls Event 13-14 Boys
13-14
37.19 34.59 31.89 30.59 29.29 27.89 50 FR LCM 25.69 26.89 28.19 29.39 31.79 34.29
1:21.19 1:15.39 1:09.59 1:06.69 1:03.79 1:00.89 100 FR LCM 56.39 58.99 1:01.69 1:04.39 1:09.79 1:15.09
2:55.29 2:42.79 2:30.29 2:23.99 2:17.79 2:11.49 200 FR LCM 2:02.99 2:08.89 2:14.69 2:20.59 2:32.29 2:43.99
6:08.09 5:41.79 5:15.49 5:02.39 4:49.19 4:36.09 400 FR LCM 4:21.29 4:33.79 4:46.19 4:58.69 5:23.49 5:48.39
12:45.49 11:50.79 10:56.09 10:28.79 10:01.49 9:34.09 800 FR LCM 9:00.49 9:26.19 9:51.99 10:17.69 11:09.19 12:00.59
24:28.39 22:43.49 20:58.59 20:06.19 19:13.69 18:21.29 1500 FR LCM 17:18.49 18:07.89 18:57.39 19:46.79 21:25.69 23:04.59
1:29.69 1:23.29 1:16.89 1:13.69 1:10.49 1:07.29 100 BK LCM 1:02.79 1:05.79 1:08.69 1:11.69 1:17.69 1:23.69
3:13.29 2:59.49 2:45.69 2:38.79 2:31.89 2:24.99 200 BK LCM 2:16.29 2:22.79 2:29.29 2:35.79 2:48.79 3:01.79
1:42.39 1:34.99 1:27.69 1:24.09 1:20.39 1:16.79 100 BR LCM 1:10.29 1:13.69 1:16.99 1:20.39 1:27.09 1:33.79
3:40.29 3:24.59 3:08.89 3:00.99 2:53.09 2:45.29 200 BR LCM 2:32.09 2:39.39 2:46.59 2:53.79 3:08.29 3:22.79
1:27.19 1:20.99 1:14.79 1:11.69 1:08.59 1:05.39 100 FL LCM 1:00.29 1:03.09 1:05.99 1:08.89 1:14.59 1:20.29
3:15.69 3:01.69 2:47.79 2:40.79 2:33.79 2:26.79 200 FL LCM 2:14.79 2:21.19 2:27.59 2:33.99 2:46.79 2:59.69
3:17.19 3:03.09 2:48.99 2:41.99 2:34.89 2:27.89 200 IM LCM 2:17.19 2:23.69 2:30.19 2:36.69 2:49.79 3:02.89
6:57.99 6:28.19 5:58.29 5:43.39 5:28.39 5:13.49 400 IM LCM 4:52.99 5:06.99 5:20.89 5:34.89 6:02.79 6:30.69

# 2:35.59 2:24.39 2:13.29 2:07.79 2:02.19 1:56.69 200 FR-R LCM 1:47.69 1:52.79 1:57.89 2:03.09 2:13.29 2:23.59
# 5:40.89 5:16.49 4:52.19 4:39.99 4:27.79 4:15.69 400 FR-R LCM 3:56.49 4:07.69 4:18.99 4:30.19 4:52.79 5:15.29
# 12:28.29 11:34.79 10:41.39 10:14.59 9:47.89 9:21.19 800 FR-R LCM 8:42.99 9:07.89 9:32.79 9:57.69 10:47.49 11:37.29
# 2:53.29 2:40.89 2:28.49 2:22.39 2:16.19 2:09.99 200 MED-R LCM 1:59.19 2:04.89 2:10.59 2:16.29 2:27.59 2:38.99
# 6:18.39 5:51.39 5:24.29 5:10.79 4:57.29 4:43.79 400 MED-R LCM 4:21.79 4:34.29 4:46.79 4:59.19 5:24.09 5:49.09

# 15-16 Girls Event 15-16 Boys
15-16
36.09 33.49 30.89 29.59 28.29 27.09 50 FR LCM 24.69 25.89 26.99 28.19 30.59 32.89
1:18.39 1:12.79 1:07.19 1:04.39 1:01.59 58.79 100 FR LCM 53.79 56.39 58.99 1:01.49 1:06.69 1:11.79
2:49.19 2:37.09 2:25.09 2:18.99 2:12.99 2:06.89 200 FR LCM 1:57.49 2:03.09 2:08.69 2:14.29 2:25.39 2:36.59
5:55.19 5:29.89 5:04.49 4:51.79 4:39.09 4:26.39 400 FR LCM 4:10.59 4:22.49 4:34.39 4:46.39 5:10.19 5:34.09
12:17.79 11:25.09 10:32.39 10:05.99 9:39.69 9:13.29 800 FR LCM 8:40.49 9:05.29 9:29.99 9:54.79 10:44.39 11:33.99
23:33.49 21:52.49 20:11.59 19:21.09 18:30.59 17:40.09 1500 FR LCM 16:36.19 17:23.59 18:11.09 18:58.49 20:33.39 22:08.29
1:26.89 1:20.69 1:14.49 1:11.39 1:08.29 1:05.19 100 BK LCM 59.49 1:02.39 1:05.19 1:07.99 1:13.69 1:19.39
3:06.79 2:53.39 2:40.09 2:33.39 2:26.79 2:20.09 200 BK LCM 2:09.19 2:15.39 2:21.49 2:27.69 2:39.99 2:52.29
1:38.59 1:31.59 1:24.49 1:20.99 1:17.49 1:13.99 100 BR LCM 1:07.09 1:10.29 1:13.49 1:16.69 1:23.09 1:29.49
3:32.49 3:17.29 3:02.09 2:54.49 2:46.99 2:39.39 200 BR LCM 2:25.89 2:32.79 2:39.79 2:46.69 3:00.59 3:14.49
1:24.29 1:18.29 1:12.29 1:09.29 1:06.29 1:03.29 100 FL LCM 57.59 1:00.29 1:03.09 1:05.79 1:11.29 1:16.79
3:07.79 2:54.39 2:40.99 2:34.29 2:27.59 2:20.89 200 FL LCM 2:08.79 2:14.89 2:21.09 2:27.19 2:39.49 2:51.69
3:11.19 2:57.49 2:43.89 2:36.99 2:30.19 2:23.39 200 IM LCM 2:12.09 2:18.39 2:24.69 2:30.99 2:43.59 2:56.19
6:44.69 6:15.79 5:46.89 5:32.49 5:17.99 5:03.59 400 IM LCM 4:41.09 4:54.39 5:07.79 5:21.19 5:47.99 6:14.69

# 2:36.49 2:25.39 2:14.19 2:08.59 2:02.99 1:57.39 200 FR-R LCM 1:44.89 1:49.89 1:54.89 1:59.89 2:09.89 2:19.89
# 5:41.09 5:16.79 4:52.39 4:40.19 4:27.99 4:15.89 400 FR-R LCM 3:49.89 4:00.89 4:11.79 4:22.79 4:44.69 5:06.49
# 12:25.39 11:32.19 10:38.89 10:12.29 9:45.69 9:19.09 800 FR-R LCM 8:32.59 8:56.99 9:21.39 9:45.79 10:34.69 11:23.49
# 2:53.99 2:41.49 2:29.09 2:22.89 2:16.69 2:10.49 200 MED-R LCM 1:56.29 2:01.89 2:07.39 2:12.89 2:23.99 2:35.09
# 6:14.39 5:47.69 5:20.89 5:07.59 4:54.19 4:40.79 400 MED-R LCM 4:15.89 4:28.09 4:40.19 4:52.39 5:16.79 5:41.19

# Page 7 of 8
# USA Swimming 2024-2028 Motivational Standards
# 8/29/2024 1:21:39 AM
# B BB A AA AAA AAAA AAAA AAA AA A BB B

# 17-18 Girls Event 17-18 Boys
17-18
35.89 33.29 30.69 29.49 28.19 26.89 50 FR LCM 23.99 25.09 26.19 27.39 29.59 31.89
1:17.69 1:12.19 1:06.59 1:03.89 1:01.09 58.29 100 FR LCM 52.39 54.89 57.39 59.89 1:04.89 1:09.89
2:47.69 2:35.69 2:23.69 2:17.69 2:11.69 2:05.79 200 FR LCM 1:54.69 2:00.09 2:05.59 2:11.09 2:21.99 2:32.89
5:53.39 5:28.19 5:02.99 4:50.29 4:37.69 4:25.09 400 FR LCM 4:04.89 4:16.49 4:28.19 4:39.79 5:03.09 5:26.49
12:10.29 11:18.19 10:25.99 9:59.89 9:33.79 9:07.79 800 FR LCM 8:28.49 8:52.69 9:16.89 9:41.09 10:29.49 11:17.89
23:20.89 21:40.79 20:00.79 19:10.79 18:20.69 17:30.69 1500 FR LCM 16:19.39 17:05.99 17:52.59 18:39.29 20:12.49 21:45.79
1:25.89 1:19.79 1:13.69 1:10.59 1:07.49 1:04.49 100 BK LCM 58.19 1:00.89 1:03.69 1:06.49 1:11.99 1:17.49
3:05.79 2:52.49 2:39.19 2:32.59 2:25.99 2:19.29 200 BK LCM 2:06.89 2:12.89 2:18.99 2:24.99 2:37.09 2:49.19
1:37.49 1:30.49 1:23.59 1:20.09 1:16.59 1:13.09 100 BR LCM 1:05.09 1:08.19 1:11.29 1:14.39 1:20.59 1:26.69
3:29.89 3:14.99 2:59.99 2:52.49 2:44.99 2:37.49 200 BR LCM 2:21.89 2:28.59 2:35.39 2:42.19 2:55.69 3:09.19
1:23.59 1:17.69 1:11.69 1:08.69 1:05.69 1:02.69 100 FL LCM 55.99 58.69 1:01.29 1:03.99 1:09.29 1:14.59
3:04.49 2:51.39 2:38.19 2:31.59 2:24.99 2:18.39 200 FL LCM 2:05.29 2:11.29 2:17.19 2:23.19 2:35.09 2:46.99
3:09.29 2:55.79 2:42.29 2:35.49 2:28.79 2:21.99 200 IM LCM 2:08.99 2:15.09 2:21.19 2:27.39 2:39.59 2:51.89
6:40.29 6:11.69 5:43.09 5:28.79 5:14.49 5:00.29 400 IM LCM 4:35.69 4:48.79 5:01.89 5:15.09 5:41.29 6:07.59

# 2:34.19 2:23.19 2:12.19 2:06.69 2:01.19 1:55.59 200 FR-R LCM 1:40.99 1:45.79 1:50.59 1:55.39 2:04.99 2:14.59
# 5:34.19 5:10.29 4:46.39 4:34.49 4:22.59 4:10.59 400 FR-R LCM 3:40.49 3:50.99 4:01.49 4:11.99 4:32.99 4:53.99
# 12:15.79 11:23.29 10:30.69 10:04.39 9:38.19 9:11.89 800 FR-R LCM 8:10.89 8:34.19 8:57.59 9:20.99 10:07.69 10:54.49
# 2:51.39 2:39.09 2:26.89 2:20.79 2:14.69 2:08.49 200 MED-R LCM 1:51.39 1:56.69 2:01.99 2:07.29 2:17.89 2:28.49
# 6:10.89 5:44.39 5:17.89 5:04.69 4:51.39 4:38.19 400 MED-R LCM 4:02.89 4:14.49 4:26.09 4:37.59 5:00.79 5:23.89

# Page 8 of 8
`;
    const times = new Map();

    let rows = data.split('\n');
    let ageKey;
    for (let row of rows) {
        if (row.startsWith('#') || row.trim() === '') {
            continue;
        }
        let parts = row.split(' ');
        if (parts.length == 1) {
            ageKey = parts[0];
            continue;
        }

        let stds = ('B BB A AA AAA AAAA d s c AAAA AAA AA A BB B').split(' ');

        let std = `${ageKey} ${parts[6]} ${parts[7]} ${parts[8]}`;

        for (let i = 0; i < 6; ++i) {
            times.set(`Female ${std} ${stds[i]}`, [parts[i], timeToInt(parts[i])]);
        }

        for (let i = 9; i < 15; ++i) {
            times.set(`Male ${std} ${stds[i]}`, [parts[i], timeToInt(parts[i])]);
        }
    }

    function getAgeGroupMotivationTime(key) {
        return times.get(key) || ['', 0]
    }

    window.getAgeGroupMotivationTime = getAgeGroupMotivationTime;
})();


(function () {
    let data = `
# 2024-10-01
meet: SILVER: PNS 2024-2025 SILVER TIME
5-10 SCM	LCM	SCY
49.19	49.99	47.39	50	Free	47.19	49.99	49.19
1:47.69	1:49.29	1:42.29	100	Free	1:41.29	1:45.59	1:43.99
3:40.29	3:43.49	3:27.29	200	Free	3:27.09	3:36.49	3:33.29
7:42.19	7:48.59	8:40.59	400/500	Free	8:38.09	7:38.29	7:31.89
55.19	55.79	53.79	50	Back	53.79	56.99	56.09
1:59.89	2:01.09	1:50.59	100	Back	1:49.59	1:56.09	1:54.89
1:01.89	1:02.89	59.19	50	Breast	58.89	1:02.59	1:01.59
2:09.49	2:11.49	2:03.69	100	Breast	2:00.29	2:11.19	2:09.09
56.59	57.29	53.39	50	Fly	54.89	58.09	57.29
2:11.39	2:12.79	1:56.69	100	Fly	1:53.49	2:09.49	2:08.09
1:58.99	X	1:51.19	100	IM	1:51.89	X	1:59.99
4:12.49	4:15.69	3:45.89	200	IM	3:44.99	4:09.49	4:06.29
11-12
37.69	38.49	36.29	50	Free	36.79	38.89	37.89
1:24.59	1:26.19	1:21.29	100	Free	1:22.29	1:28.19	1:26.59
3:11.29	3:12.89	2:48.39	200	Free	2:52.29	3:19.39	3:17.79
6:26.49	6:32.89	7:09.19	400/500	Free	7:02.09	6:21.09	6:14.69
13:28.79	13:41.59	15:02.69	800/1000	Free	14:43.49	13:20.19	13:07.39
25:42.89	26:06.89	25:07.39	1500/1650	Free	24:27.69	25:51.79	25.27.79
45.49	46.09	42.79	50	Back	44.09	46.29	45.69
1:36.09	1:37.29	1:31.99	100	Back	1:31.09	1:38.59	1:37.39
3:25.69	3:28.09	3:08.49	200	Back	3:05.19	3:22.99	3:20.59
51.69	52.69	48.39	50	Breast	48.79	52.99	51.89
1:50.39	1:52.39	1:42.19	100	Breast	1:41.69	1:51.29	1:50.29
3:52.79	3:56.79	3:30.89	200	Breast	3:32.09	3:57.89	3:43.89
45.69	46.39	42.19	50	Fly	43.29	46.09	45.39
1:42.19	1:43.59	1:30.69	100	Fly	1:30.59	1:42.29	1:40.89
3:28.29	3:31.09	3:09.49	200	Fly	3:09.49	3:24.79	3:21.99
1:37.09	X	1:30.89	100	IM	1:31.69	X	1:37.99
3:27.59	3:30.79	3:05.49	200	IM	3:03.99	3:33.09	3:29.89
7:25.69	7:28.89	6:31.69	400	IM	6:17.09	7:17.89	7:14.69
13-14
34.19	34.99	32.09	50	Free	29.79	32.29	31.49
1:16.99	1:17.89	1:11.89	100	Free	1:06.69	1:11.79	1:10.99
2:49.29	2:52.49	2:34.39	200	Free	2:24.39	2:44.19	2:40.99
6:04.69	6:11.09	6:34.89	400/500	Free	6:10.09	6:04.69	5:28.29
12:32.69	12:45.49	14:11.09	800/1000	Free	13:17.99	12:00.59	11:47.79
24:04.39	24:28.39	23:42.89	1500/1650	Free	22:22.89	23:04.59	22:40.59
44.69	45.29	38.89	50	Back	36.39	44.09	43.49
1:28.69	1:29.89	1:19.99	100	Back	1:16.79	1:28.49	1:27.29
3:09.69	3:12.09	2:42.29	200	Back	2:34.99	3:09.69	3:07.29
49.69	50.69	44.59	50	Breast	40.79	49.09	48.09
1:45.89	1:47.89	1:34.29	100	Breast	1:27.39	1:36.69	1:34.69
3:37.49	3:41.49	3:12.89	200	Breast	2:57.99	3:37.89	3:33.89
42.09	42.79	36.49	50	Fly	33.99	39.99	39.19
1:34.69	1:36.09	1:21.39	100	Fly	1:13.89	1:26.99	1:25.59
3:12.89	3:36.69	2:58.69	200	Fly	2:43.89	3:24.69	2:56.89
1:29.19	X	1:22.99	100	IM	1:18.79	X	1:25.09
3:11.89	3:15.09	2:50.89	200	IM	2:37.49	3:03.79	3:00.59
6:51.59	6:57.99	6:05.79	400	IM	5:37.69	6:30.69	6:24.29
15-18
31.29	32.09	28.89	50	Free	25.29	28.49	27.69
1:08.89	1:10.49	1:03.79	100	Free	55.69	1:02.79	1:01.19
2:31.19	2:34.39	2:17.39	200	Free	2:02.39	2:18.89	2:15.69
5:24.19	5:30.59	6:06.79	400/500	Free	5:35.59	5:08.19	5:01.79
12:04.99	12:17.79	13:52.89	800/1000	Free	12:51.79	11:33.99	11:21.19
23:09.49	23:33.49	23:15.89	1500/1650	Free	21:26.59	22:08.29	21:44.29
40.49	41.09	33.99	50	Back	30.59	35.89	35.29
1:21.39	1:22.59	1:12.19	100	Back	1:06.09	1:14.89	1:13.69
3:00.09	3:02.49	2:37.19	200	Back	2:23.79	2:46.49	2:44.09
45.89	46.89	41.69	50	Breast	36.99	40.89	39.89
1:37.19	1:39.19	1:24.99	100	Breast	1:15.59	1:25.39	1:23.39
3:26.39	3:30.39	2:59.89	200	Breast	2:43.89	3:03.19	2:59.19
35.89	36.59	33.79	50	Fly	29.59	32.49	31.79
1:20.89	1:22.29	1:10.89	100	Fly	1:01.29	1:09.19	1:07.79
3:04.99	3:07.79	2:45.79	200	Fly	2:30.89	2:51.69	2:48.89
1:21.19	X	1:15.09	100	IM	1:07.89	X	1:14.49
2:51.59	2:54.79	2:33.69	200	IM	2:19.29	2:36.39	2:33.19
6:38.29	6:44.69	5:54.99	400	IM	5:22.19	6:14.69	6:08.29

# 2024-10-01
meet: GOLD: PNS 2024-2025 GOLD TIME
5-10 SCM	LCM	SCY
40.99	41.79	39.09	50	Free	39.19	40.39	39.29
1:32.69	1:34.29	1:26.99	100	Free	1:26.69	1:30.99	1:29.39
3:17.29	3:20.49	3:04.49	200	Free	3:02.89	3:13.19	3:09.99
6:55.29	7:01.69	7:42.29	400/500	Free	7:35.19	6:52.49	6:46.09
48.29	48.89	45.39	50	Back	45.19	47.79	47.19
1:47.49	1:48.69	1:34.59	100	Back	1:34.59	1:42.79	1:41.59
54.69	55.69	50.39	50	Breast	50.39	55.49	54.49
1:55.89	1:57.89	1:45.69	100	Breast	1:42.29	1:56.89	1:54.89
47.89	48.59	44.29	50	Fly	45.09	47.69	46.99
1:54.09	1:55.39	1:41.39	100	Fly	1:38.99	1:52.89	1:51.29
1:41.99	X	1:35.39	100	IM	1:34.99	X	1:42.49
3:45.69	3:48.89	3:17.39	200	IM	3:14.09	3:43.69	3:40.49
11-12
33.79	34.59	31.59	50	Free	31.59	34.39	33.59
1:14.89	1:16.49	1:10.09	100	Free	1:09.99	1:16.39	1:14.79
2:49.49	2:51.09	2:28.89	200	Free	2:26.69	2:52.19	2:50.59
5:58.39	6:04.79	6:43.79	400/500	Free	6:25.89	5:53.89	5:47.49
12:30.09	12:42.89	13:58.19	800/1000	Free	13:40.39	12:22.99	12:10.19
23:50.99	24:14.99	23:19.69	1500/1650	Free	22:42.89	24:00.99	23:36.99
40.79	41.39	37.19	50	Back	37.79	41.39	40.79
1:26.99	1:28.39	1:19.29	100	Back	1:19.39	1:28.29	1:26.99
3:10.89	3:13.29	2:47.29	200	Back	2:43.69	3:08.49	3:06.09
46.19	47.19	42.39	50	Breast	42.09	47.49	47.39
1:40.79	1:41.69	1:30.39	100	Breast	1:30.69	1:41.69	1:40.79
3:35.89	3:39.89	3:12.39	200	Breast	3:14.09	3:40.59	3:27.59
38.49	39.19	35.29	50	Fly	35.49	39.19	38.49
1:29.59	1:30.99	1:18.29	100	Fly	1:19.69	1:30.99	1:27.59
3:13.19	3:10.99	2:52.79	200	Fly	2:52.79	3:10.19	3:07.39
1:26.99	X	1:20.19	100	IM	1:18.69	X	1:25.09
3:07.39	3:10.59	2:46.09	200	IM	2:41.69	3:08.99	3:05.79
6:53.59	7:50.79	6:03.69	400	IM	6:20.09	7:00.59	6:43.39
13-14
30.99	31.79	28.69	50	Free	26.69	29.59	28.79
1:08.69	1:09.49	1:02.99	100	Free	58.49	1:05.69	1:04.89
2:29.89	2:33.09	2:15.69	200	Free	2:08.59	2:29.69	2:26.49
5:28.09	5:34.49	6:06.19	400/500	Free	5:46.29	5:20.29	5:13.89
11:37.99	11:50.79	13:10.29	800/1000	Free	12:20.99	11:09.19	10:56.39
22:19.49	22:43.49	22:01.19	1500/1650	Free	20:46.99	21:25.69	21:01.69
39.39	39.99	33.79	50	Back	31.59	38.09	37.49
1:19.99	1:21.19	1:10.49	100	Back	1:06.89	1:16.79	1:15.59
2:54.99	2:57.39	2:34.59	200	Back	2:20.39	2:50.59	2:48.19
45.69	46.69	38.99	50	Breast	36.19	44.09	43.19
1:32.29	1:34.29	1:22.79	100	Breast	1:16.39	1:27.99	1:25.99
3:22.59	3:26.59	2:51.99	200	Breast	2:37.89	3:13.39	3:09.39
38.49	39.09	31.99	50	Fly	29.69	36.39	35.69
1:21.89	1:23.29	1:10.79	100	Fly	1:05.69	1:15.29	1:13.89
2:58.89	3:21.69	2:49.39	200	Fly	2:41.69	3:09.79	3:03.99
1:20.39	X	1:14.29	100	IM	1:10.29	X	1:16.99
2:56.99	3:00.19	2:32.79	200	IM	2:22.79	2:46.59	2:43.39
6:21.79	6:28.19	5:39.69	400	IM	5:13.59	6:02.79	5:56.39
15-18
28.79	30.89	26.49	50	Free	23.49	27.19	25.89
1:03.19	1:07.29	57.69	100	Free	51.29	58.99	56.59
2:18.79	2:27.99	2:05.39	200	Free	1:52.79	2:14.39	2:05.19
5:02.49	5:20.89	5:54.69	400/500	Free	5:11.99	4:57.39	4:38.99
11:12.29	11:25.09	12:53.49	800/1000	Free	11:56.69	10:44.39	10:31.59
21:28.49	21:52.49	21:36.19	1500/1650	Free	19:54.69	20:33.39	20:09.39
37.29	37.89	32.19	50	Back	29.09	33.69	33.09
1:13.49	1:19.09	1:05.19	100	Back	59.19	1:10.89	1:06.89
2:45.69	2:50.09	2:24.39	200	Back	2:15.99	2:40.09	2:29.19
42.09	43.09	37.09	50	Breast	34.09	37.29	36.29
1:27.99	1:29.99	1:16.99	100	Breast	1:06.99	1:19.29	1:13.29
3:10.09	3:14.09	2:49.19	200	Breast	2:28.79	2:58.29	2:46.29
34.09	34.79	30.39	50	Fly	27.89	31.29	29.59
1:10.59	1:16.89	1:03.19	100	Fly	56.99	1:05.89	1:01.49
2:51.59	2:59.39	2:40.99	200	Fly	2:19.49	2:39.49	2:36.69
1:15.59	X	1:09.09	100	IM	1:02.69	X	1:09.39
2:39.79	2:49.99	2:20.99	200	IM	2:07.19	2:30.79	2:21.89
6:09.39	6:15.79	5:29.69	400	IM	4:59.19	5:47.99	5:41.59

# 2024-10-01
meet: PNS_c : 2024 PN 14&U SC Championships (Consideration) (12/14/2024)
6-10 SCM LCM SCY
35.39	36.19	31.69	50	Free	32.39	36.79	35.99
1:20.09	1:21.79	1:10.99	100	Free	1:13.59	1:23.29	1:20.99
2:57.29	3:00.49	2:38.79	200	Free	2:43.09	3:03.89	3:00.59
6:08.49	6:14.89	6:53.39	400/500	Free	6:53.39	6:14.89	6:08.49
42.09	42.79	37.39	50	Back	38.49	42.89	42.19
1:33.59	1:34.89	1:21.69	100	Back	1:23.69	1:34.89	1:33.59
48.79	49.39	42.99	50	Breast	44.19	50.69	49.99
1:47.09	1:49.79	1:34.79	100	Breast	1:38.29	1:50.89	1:48.89
41.39	42.09	36.19	50	Fly	38.19	44.09	43.39
1:40.79	1:42.19	1:29.29	100	Fly	1:35.49	1:48.99	1:47.59
1:30.09	X	1:21.39	100	IM	1:23.49	X	1:31.09
3:26.19	3:28.89	2:59.69	200	IM	3:08.39	3:40.39	3:36.79
11-12
31.29	32.19	28.19	50	Free	27.69	32.59	31.79
1:09.99	1:11.49	1:02.49	100	Free	1:01.99	1:11.09	1:09.49
2:31.19	2:40.49	2:19.49	200	Free	2:18.29	2:36.99	2:33.79
5:32.89	5:39.09	6:20.69	400/500	Free	6:15.39	5:46.99	5:40.59
21:54.89	22:22.99	21:32.09	1650/1500	Fr	21:32.09	22:22.99	21:54.89
37.99	38.59	33.69	50	Back	32.49	39.29	38.69
1:21.89	1:23.09	1:12.89	100	Back	1:12.09	1:24.09	1:22.89
2:57.19	2:59.69	2:40.59	200	Back	2:38.99	3:01.49	2:59.09
43.69	44.79	38.19	50	Breast	38.39	45.59	44.59
1:34.09	1:36.09	1:23.49	100	Breast	1:21.09	1:37.09	1:35.09
3:23.09	3:27.69	2:59.99	200	Breast	3:08.19	3:36.59	3:32.59
35.29	35.99	31.39	50	Fly	31.89	37.19	36.49
1:24.89	1:26.19	1:15.49	100	Fly	1:14.89	1:24.89	1:23.49
3:13.19	3:15.99	2:50.29	200	Fly	2:43.99	3:10.19	3:07.39
1:19.89	X	1:13.19	100	IM	1:12.39	X	1:18.89
2:53.39	2:56.59	2:37.89	200	IM	2:33.89	3:01.79	2:58.59
6:50.09	6:56.79	6:00.99	400	IM	6:07.19	6:46.59	6:40.19
13-14
29.39	30.29	26.49	50	Free	24.79	28.09	27.29
1:04.59	1:06.19	57.99	100	Free	53.69	1:01.59	59.99
2:22.89	2:26.09	2:07.99	200	Free	1:58.39	2:17.49	2:14.29
5:15.09	5:21.19	5:51.19	400/500	Free	5:31.29	5:01.29	4:54.89
20:33.99	20:58.59	20:19.59	1500/1650	Fr	19:11.09	19:46.79	19:22.79
1:16.59	1:17.89	1:06.89	100	Back	1:02.09	1:11.89	1:10.69
2:45.79	2:48.09	2:27.29	200	Back	2:15.89	2:36.79	2:34.39
1:27.99	1:30.09	1:15.99	100	Breast	1:08.69	1:21.99	1:19.99
3:05.89	3:09.79	2:44.49	200	Breast	2:32.29	2:59.59	2:55.59
1:14.09	1:15.49	1:05.99	100	Fly	1:00.69	1:09.09	1:07.69
3:09.29	3:11.99	2:39.09	200	Fly	2:23.99	2:56.59	2:53.79
2:41.69	2:44.59	2:24.29	200	IM	2:14.99	2:34.99	2:31.79
5:58.19	6:04.69	5:20.09	400	IM	4:51.69	5:40.99	5:34.59

# 2024-10-01
meet: PNS_a : 2024 PN 14&U SC Championships (Automatic) (12/14/2024)
6-10 SCM LCM SCY
34.99	35.79	31.29	50	Free	31.79	36.29	35.39
1:18.79	1:20.39	1:09.49	100	Free	1:11.49	1:21.09	1:19.09
2:55.69	2:58.89	2:32.49	200	Free	2:40.79	2:59.39	2:56.09
5:52.89	5:59.29	6:38.19	400/500	Free	6:38.19	5:59.29	5:52.89
41.49	42.09	36.49	50	Back	37.49	42.09	41.49
1:32.39	1:33.59	1:19.89	100	Back	1:21.89	1:32.89	1:31.49
47.79	48.49	42.19	50	Breast	43.39	49.99	49.19
1:38.69	1:40.69	1:33.09	100	Breast	1:35.49	1:48.69	1:46.79
40.09	40.79	35.39	50	Fly	37.09	42.39	41.79
1:35.59	1:36.99	1:25.29	100	Fly	1:30.69	1:40.59	1:39.09
1:28.49	X	1:20.09	100	IM	1:22.19	X	1:29.69
3:17.19	3:20.39	2:53.29	200	IM	3:03.39	3:30.89	3:27.99
11-12
30.79	31.59	27.69	50	Free	27.09	31.69	30.79
1:07.99	1:09.59	1:00.99	100	Free	59.59	1:08.89	1:07.19
2:30.79	2:33.99	2:17.09	200	Free	2:13.99	2:32.39	2:29.39
5:22.89	5:29.29	6:11.89	400/500	Free	6:05.49	5:38.19	5:31.79
21:03.09	21:27.09	20:38.19	1650/1500	Fr	20:38.19	21:27.09	21:03.09
36.89	37.49	33.19	50	Back	31.99	37.99	37.39
1:19.69	1:20.89	1:11.19	100	Back	1:09.99	1:20.89	1:19.79
2:48.79	2:51.19	2:34.29	200	Back	2:34.49	2:51.49	2:49.09
42.29	43.29	37.59	50	Breast	36.49	44.89	43.99
1:30.69	1:32.69	1:21.39	100	Breast	1:17.89	1:35.59	1:33.19
3:16.79	3:20.79	2:55.49	200	Breast	2:58.39	3:23.99	3:19.99
33.99	34.69	30.59	50	Fly	30.99	35.79	35.09
1:22.49	1:23.89	1:12.69	100	Fly	1:11.79	1:21.49	1:20.09
2:58.09	3:00.89	2:37.19	200	Fly	2:31.39	2:55.59	2:52.79
1:17.99	X	1:11.89	100	IM	1:11.49	X	1:17.69
2:50.79	2:53.99	2:34.29	200	IM	2:30.79	2:55.89	2:52.69
6:23.29	6:29.69	5:46.19	400	IM	5:46.19	6:22.59	6:16.19
13-14
28.69	29.49	26.09	50	Free	24.09	27.69	26.89
1:02.89	1:04.49	56.89	100	Free	52.79	1:00.09	57.69
2:21.29	2:24.49	2:06.49	200	Free	1:56.79	2:13.79	2:10.69
4:58.09	5:04.49	5:40.99	400/500	Free	5:20.59	4:51.39	4:45.39
19:42.19	20:06.19	19:28.79	1500/1650	Fr	18:23.09	18:57.39	18:33.59
34.39	34.99	29.59	50	Back	26.49	30.99	30.29
1:14.49	1:15.69	1:05.59	100	Back	1:00.49	1:09.99	1:08.69
2:41.19	2:43.59	2:22.69	200	Back	2:11.89	2:32.89	2:30.39
37.89	38.89	34.49	50	Breast	29.99	34.49	33.19
1:22.99	1:24.99	1:14.49	100	Breast	1:08.19	1:19.19	1:17.29
3:04.09	3:08.09	2:41.49	200	Breast	2:27.89	2:53.29	2:49.29
30.09	30.79	27.99	50	Fly	25.09	28.09	27.39
1:12.89	1:14.29	1:05.29	100	Fly	58.89	1:06.29	1:04.89
2:44.99	2:47.79	2:26.69	200	Fly	2:14.39	2:33.99	2:31.29
2:37.19	2:40.39	2:22.29	200	IM	2:10.19	2:29.99	2:26.69
5:40.99	5:47.39	5:09.89	400	IM	4:42.29	5:29.09	5:22.89

# 2024-10-01
meet: PNS_c : 2024 PNS Senior SC Championships (Consideration) (12/19/2024)
15-18 SCM LCM SCY
28.79	29.59	25.79	50	Free	22.89	26.39	25.59
1:02.99	1:04.49	55.99	100	Free	49.99	57.59	55.99
2:20.39	2:23.59	2:02.99	200	Free	1:50.59	2:09.39	2:06.19
5:04.99	5:11.79	5:40.79	400/500	Free	5:13.39	4:45.79	4:39.39
10:19.59	10:32.39	11:53.99	800/1000	Free	11:01.59	9:54.79	9:41.99
19:47.59	20:11.59	19:56.49	1500/1650	Free	18:22.79	18:58.49	18:45.69
35.59	36.19	30.69	50	Back	27.89	32.19	31.59
1:14.09	1:15.29	1:03.79	100	Back	57.49	1:08.39	1:07.19
2:45.19	2:47.59	2:21.89	200	Back	2:11.39	2:33.49	2:31.09
39.99	41.09	35.89	50	Breast	32.49	36.39	35.09
1:26.39	1:28.49	1:14.39	100	Breast	1:04.89	1:16.09	1:14.09
3:02.79	3:06.79	2:40.09	200	Breast	2:27.29	2:53.19	2:49.09
31.19	32.19	29.49	50	Fly	26.39	29.99	29.29
1:11.59	1:12.99	1:02.59	100	Fly	55.39	1:03.39	1:01.99
2:51.99	2:54.39	2:36.89	200	Fly	2:13.59	2:37.39	2:34.59
2:39.99	2:43.39	2:19.39	200	IM	2:05.69	2:25.59	2:22.39
5:40.49	5:46.89	5:19.39	400	IM	4:43.19	5:34.29	5:27.89

# 2024-10-01
meet: PNS_a : 2024 PNS Senior SC Championships (Automatic) (12/19/2024)
15-18 SCM LCM SCY
27.99	28.79	25.29	50	Free	22.49	25.89	25.09
1:00.89	1:02.49	54.89	100	Free	49.09	54.49	53.19
2:14.19	2:17.39	2:00.29	200	Free	1:48.19	2:06.19	2:02.99
4:49.79	4:56.19	5:30.19	400/500	Free	5:02.09	4:36.09	4:29.69
9:53.19	10:05.99	11:24.19	800/1000	Free	10:33.99	9:29.99	9:17.49
18:57.09	19:21.09	19:06.69	1500/1650	Free	17:36.89	18:11.09	17:58.99
34.39	34.99	29.59	50	Back	26.49	30.99	30.29
1:10.49	1:11.69	1:01.39	100	Back	55.59	1:05.59	1:04.09
2:35.49	2:37.89	2:16.29	200	Back	2:05.49	2:26.59	2:24.29
37.89	38.89	34.49	50	Breast	29.99	34.39	33.19
1:20.99	1:22.99	1:11.59	100	Breast	1:02.49	1:13.69	1:11.69
2:57.89	3:01.89	2:37.39	200	Breast	2:20.29	2:46.19	2:42.19
30.09	30.79	27.99	50	Fly	25.09	28.09	27.39
1:07.59	1:08.99	1:00.49	100	Fly	53.89	1:01.49	59.99
2:44.09	2:46.99	2:22.89	200	Fly	2:05.39	2:27.19	2:24.39
2:33.09	2:36.29	2:15.49	200	IM	2:02.09	2:21.99	2:18.79
5:38.19	5:44.59	4:58.69	400	IM	4:31.19	5:13.39	5:06.99

# MARCH 21-24, 2024 (01/15/24)
meet: NWReg : 2024 Northwest Age Group Regionals (3/21/2024)
SCY 15-18 14 13 12 11 6-10
25.59 25.89 26.59 27.79 29.39 31.39 50 FR 31.69 29.49 26.79 24.89 23.79 22.89
55.19 56.29 57.99 1:00.19 1:04.89 1:10.39 100 FR 1:11.29 1:05.29 58.99 54.09 51.79 49.79
2:00.19 2:02.79 2:06.79 2:14.39 2:24.69 2:36.19 200 FR 2:38.39 2:27.69 2:10.19 1:59.09 1:54.39 1:49.19
5:28.19 5:29.89 5:43.29 5:57.29 6:26.79 6:26.79 500 FR 6:37.69 6:37.69 5:52.69 5:20.29 5:09.99 5:02.69
19:34.39 19:34.39 20:08.19 21:20.39 21:20.39 - 1650 FR - 21:20.39 21:20.39 19:32.89 17:46.59 18:25.99
- - - 32.39 34.69 37.09 50 BK 37.69 34.99 31.69 - - -
1:02.19 1:03.29 1:06.19 1:09.79 1:14.59 1:20.49 100 BK 1:21.99 1:16.29 1:08.49 1:02.89 59.09 56.79
2:15.59 2:19.09 2:23.89 2:34.09 2:34.09 - 200 BK - 2:33.89 2:33.89 2:17.19 2:10.89 2:06.09
- - - 37.09 39.09 42.09 50 BR 43.49 40.29 35.59 - - -
1:12.19 1:13.19 1:16.69 1:20.89 1:25.39 1:32.79 100 BR 1:35.59 1:28.39 1:17.69 1:11.29 1:06.59 1:04.29
2:35.59 2:41.19 2:45.69 2:56.79 2:56.79 - 200 BR - 2:54.49 2:54.49 2:36.39 2:27.49 2:23.59
- - - 30.69 32.79 35.89 50 FL 37.19 33.89 30.09 - - -
1:02.19 1:03.29 1:06.29 1:10.69 1:17.79 1:26.19 100 FL 1:28.89 1:21.49 1:09.39 1:01.19 57.79 55.19
2:21.69 2:27.29 2:38.39 3:11.19 3:11.19 - 200 FL - 3:08.09 3:08.09 2:24.89 2:14.49 2:10.19
- - - 1:10.39 1:15.59 1:21.09 100 IM 1:22.29 1:16.39 1:09.19 - - -
2:23.79 2:19.79 2:24.79 2:31.99 2:41.89 2:55.49 200 IM 3:00.69 2:46.39 2:28.19 2:15.59 2:07.99 2:04.19
4:58.29 5:01.69 5:09.69 5:32.49 5:32.49 - 400 IM - 5:25.99 5:25.99 4:52.69 4:38.29 4:35.59
LCM
29.29 29.29 29.89 30.69 32.49 34.69 50 FR 34.69 32.59 29.89 28.29 26.89 26.49
1:03.19 1:03.39 1:05.19 1:07.29 1:12.09 1:17.19 100 FR 1:17.39 1:12.19 1:05.39 1:01.59 58.49 57.59
2:18.29 2:17.99 2:21.99 2:27.89 2:37.79 2:49.99 200 FR 2:50.49 2:37.99 2:23.89 2:15.39 2:08.99 2:06.69
4:57.19 4:56.19 5:04.09 5:15.29 5:35.79 5:35.79 400 FR 5:41.69 5:41.69 5:08.29 4:51.09 4:38.89 4:35.39
19:58.39 19:58.39 20:20.49 22:04.99 22:04.99 1500 FR 21:37.29 21:37.29 19:41.29 18:44.19 18:44.19
35.79 38.19 40.69 50 BK 41.09 38.39 35.29
1:13.09 1:11.39 1:13.89 1:17.19 1:22.59 1:28.59 100 BK 1:29.59 1:22.69 1:15.69 1:11.39 1:07.19 1:07.29
2:37.99 2:34.59 2:39.89 2:47.39 2:47.39 200 BK 2:45.29 2:45.29 2:34.49 2:26.19 2:30.09
40.69 43.09 46.19 50 BR 47.39 44.19 39.39
1:25.29 1:22.59 1:25.09 1:28.69 1:34.49 1:40.99 100 BR 1:43.89 1:36.49 1:26.59 1:19.99 1:15.99 1:17.79
3:04.59 2:58.19 3:04.39 3:10.89 3:10.89 200 BR 3:10.09 3:10.09 2:55.09 2:47.39 2:50.89
33.79 36.39 38.89 50 FL 39.89 36.99 33.09
1:11.19 1:10.39 1:13.19 1:17.39 1:24.59 1:33.09 100 FL 1:35.39 1:26.29 1:12.29 1:09.09 1:04.99 1:03.39
2:39.29 2:42.69 2:51.59 3:06.89 3:06.89 200 FL 2:58.79 2:58.79 2:42.19 2:30.59 2:32.29
2:38.29 2:35.89 2:41.39 2:47.19 2:59.39 3:11.29 200 IM 3:14.79 3:01.09 2:43.19 2:32.79 2:25.29 2:24.69
5:44.59 5:38.29 5:45.99 6:11.29 6:11.29 400 IM 5:56.69 5:56.69 5:28.79 5:14.59 5:19.89
SCM
28.49 28.49 29.09 29.89 31.69 33.89 50 FR 33.89 31.79 29.09 27.49 26.09 25.69
1:01.69 1:01.79 1:03.59 1:05.69 1:10.49 1:15.59 100 FR 1:15.89 1:10.49 1:03.79 59.99 56.89 55.99
2:14.99 2:14.79 2:18.79 2:24.69 2:34.59 2:46.79 200 FR 2:47.29 2:35.09 2:20.69 2:12.19 2:05.79 2:03.49
4:50.79 4:49.79 4:57.69 5:08.89 5:29.29 5:29.29 400 FR 5:35.29 5:35.29 5:01.89 4:44.69 4:32.49 4:28.99
19:34.39 19:34.39 19:56.49 21:40.99 21:40.99 1500 FR 21:13.29 21:13.29 19:17.29 18:20.19 18:20.19
35.19 37.59 40.09 50 BK 40.49 37.79 34.69
1:12.09 1:10.19 1:12.69 1:15.99 1:21.39 1:27.39 100 BK 1:28.29 1:21.39 1:14.49 1:10.19 1:05.99 1:05.99
2:35.09 2:32.19 2:37.49 2:44.99 2:44.99 200 BK 2:42.89 2:42.89 2:32.09 2:23.79 2:27.69
39.69 42.09 45.19 50 BR 46.39 43.19 38.39
1:23.29 1:20.59 1:23.09 1:26.69 1:32.09 1:38.99 100 BR 1:41.89 1:34.49 1:24.59 1:17.99 1:13.89 1:15.79
3:00.59 2:54.19 3:00.39 3:06.89 3:06.89 200 BR 3:06.09 3:06.09 2:51.09 2:43.39 2:46.89
33.09 35.69 38.19 50 FL 39.19 36.29 32.39
1:09.79 1:08.99 1:11.79 1:15.99 1:23.19 1:31.69 100 FL 1:33.99 1:24.89 1:10.89 1:07.69 1:03.59 1:01.99
2:36.49 2:39.89 2:48.79 3:04.09 3:04.09 200 FL 2:58.29 2:58.29 2:40.39 2:29.99 2:29.49
1:14.69 1:19.89 1:25.09 100 IM 1:26.69 1:21.39 1:13.69
2:35.09 2:32.69 2:38.19 2:43.99 2:56.19 3:08.09 200 IM 3:11.59 2:57.89 2:39.99 2:29.59 2:22.09 2:21.49
5:38.19 5:31.89 5:39.59 6:04.89 6:04.89 400 IM 5:50.29 5:50.29 5:22.39 5:08.19 5:13.49

meet: WZone : 2024 Western Zone Age Group Championships (8/5/2024)
6-10 SCY SCM LCM
28.89	31.89	32.79	50	FR	32.79	31.59	28.59
1:04.19	1:10.89	1:13.09	100	FR	1:12.89	1:10.29	1:03.69
2:20.89	2:35.79	2:39.79	200	FR	2:36.59	2:31.29	2:16.89
33.29	36.79	38.89	50	BK	38.89	37.09	33.49
1:11.79	1:19.29	1:23.89	100	BK	1:22.89	1:19.79	1:11.89
37.89	41.89	43.09	50	BR	42.69	41.19	37.29
1:23.09	1:31.89	1:34.89	100	BR	1:33.79	1:30.99	1:22.19
32.49	35.89	36.59	50	FL	36.29	35.29	31.99
1:14.19	1:21.99	1:24.59	100	FL	1:23.59	1:21.69	1:13.19
2:37.39	2:53.99	2:59.59	200	IM	2:58.39	2:52.49	2:36.19
11-12
26.59	29.59	30.39	50	FR	29.29	28.29	25.59
57.79	1:03.89	1:06.09	100	FR	1:03.89	1:01.69	55.79
2:05.99	2:19.99	2:23.19	200	FR	2:19.49	2:15.19	2:01.39
5:36.89	4:55.09	5:01.69	400	FR	4:55.09	4:46.89	5:27.89
29.99	33.29	34.49	50	BK	33.69	32.49	29.29
1:04.69	1:11.89	1:15.39	100	BK	1:12.99	1:09.39	1:02.79
2:18.79	2:33.39	2:40.69	200	BK	2:36.69	2:29.89	2:15.19
33.79	37.39	38.49	50	BR	37.49	36.19	32.69
1:13.19	1:21.19	1:24.79	100	BR	1:22.19	1:18.79	1:10.49
2:37.89	2:56.39	3:02.79	200	BR	2:56.59	2:49.29	2:32.49
28.69	31.89	32.39	50	FL	31.89	31.19	28.19
1:04.19	1:11.49	1:13.09	100	FL	1:10.89	1:09.39	1:02.39
2:21.39	2:36.99	2:40.99	200	FL	2:37.49	2:33.29	2:16.09
2:21.59	2:36.89	2:41.89	200	IM	2:37.79	2:31.99	2:17.29
5:01.89	5:33.59	5:45.49	400	IM	5:37.79	5:23.89	4:53.19
13-14
25.59	28.39	29.19	50	FR	27.09	26.09	23.49
55.49	1:01.49	1:03.29	100	FR	59.09	56.99	51.59
1:59.49	2:12.99	2:16.89	200	FR	2:08.89	2:04.19	1:52.39
5:20.39	4:41.49	4:48.19	400	FR	4:34.29	4:25.89	5:03.79
11:01.59	9:38.99	9:53.99	800	FR	9:30.29	9:10.89	10:29.49
18:22.79	18:16.29	18:56.49	1500	FR	18:09.39	17:25.89	17:31.99
1:00.19	1:06.99	1:10.69	100	BK	1:05.89	1:02.59	56.19
2:11.09	2:25.29	2:31.19	200	BK	2:23.09	2:16.39	2:02.79
1:09.09	1:16.99	1:20.19	100	BR	1:14.59	1:10.69	1:03.89
2:29.99	2:46.69	2:52.59	200	BR	2:41.39	2:34.89	2:18.79
59.99	1:06.79	1:08.09	100	FL	1:03.89	1:01.99	55.89
2:12.79	2:27.69	2:31.69	200	FL	2:22.19	2:17.49	2:04.29
2:13.39	2:28.89	2:33.89	200	IM	2:25.09	2:18.89	2:05.69
4:45.69	5:17.59	5:26.49	400	IM	5:08.59	4:56.79	4:28.29

meet: SprSec : 2024 Spring Speedo Sectional (3/14/2024)
11-18 SCY SCM LCM
24.99 27.76 28.44 50 FR 25.79 24.72 22.41
53.71 59.04 1:01.26 100 FR 55.89 53.27 48.46
1:56.22 2:07.92 2:12.75 200 FR 2:02.20 1:56.48 1:45.84
5:13.17 4:29.34 4:43.21 400 FR 4:23.21 4:10.18 4:49.98
10:52.09 9:27.35 9:48.19 800 FR 9:19.51 8:53.74 10:10.58
18:19.78 18:07.11 18:54.49 1500 FR 17:45.59 16:53.43 17:13.16
59.50 1:06.33 1:09.54 100 BK 1:04.26 1:00.66 54.42
2:07.80 2:22.78 2:29.20 200 BK 2:20.40 2:12.65 1:58.45
1:08.46 1:15.15 1:20.46 100 BR 1:13.70 1:07.35 1:01.53
2:29.07 2:43.68 2:54.86 200 BR 2:40.88 2:27.80 2:15.19
58.86 1:04.55 1:06.87 100 FL 1:00.97 59.43 53.46
2:12.26 2:26.43 2:32.74 200 FL 2:20.25 2:14.37 2:00.94
2:11.81 2:25.85 2:32.19 200 IM 2:19.28 2:12.30 1:59.85
4:39.34 5:07.75 5:21.68 400 IM 5:00.19 4:45.76 4:18.37

meet: SumSec : 2024 Summer Speedo Sectional (7/13/2024)
11-18 SCY SCM LCM
24.55 27.30 28.14 50 FR 25.49 24.35 22.05
53.09 58.20 1:00.69 100 FR 55.29 52.60 47.70
1:54.86 2:06.54 2:11.55 200 FR 2:01.00 1:55.49 1:44.33
5:09.03 4:26.82 4:39.11 400 FR 4:20.00 4:07.51 4:45.94
10:46.09 9:22.55 9:42.19 800 FR 9:12.79 8:48.32 10:03.86
18:09.88 17:58.11 18:44.59 1500 FR 17:36.59 16:44.43 17:03.26
58.99 1:05.55 1:08.94 100 BK 1:03.66 59.47 53.55
2:07.19 2:21.52 2:28.00 200 BK 2:19.00 2:10.89 1:56.75
1:07.46 1:14.11 1:19.63 100 BR 1:12.09 1:05.11 59.79
2:27.11 2:41.52 2:53.49 200 BR 2:38.50 2:23.36 2:11.63
58.19 1:03.73 1:06.27 100 FL 1:00.36 58:61 52.61
2:10.19 2:24.26 2:31.16 200 FL 2:19.05 2:11.94 1:58.81
2:09.73 2:23.08 2:30.51 200 IM 2:17.70 2:10.12 1:57.77
4:36.50 5:04.87 5:18.84 400 IM 4:57.79 4:40.45 4:13.34

meet: Futures : 2025 Futures Championships (7/23/2025)
11-18 SCY LCM
23.89	27.39	50 FR	24.59	21.29
51.89	59.29	100 FR	53.59	46.39
1:52.29	2:07.79	200 FR	1:57.79	1:41.59
5:02.59	4:28.79	400/500 FR	4:09.99	4:37.09
10:20.49	9:13.79	800/1000 FR	8:40.69	9:34.29
17:14.39	11:40.19	1500/1650 FR	16:38.99	16:05.49
57.09	1:06.79	100 BK	1:00.59	51.49
2:04.19	2:23.99	200 BK	2:11.89	1:52.79
1:05.49	1:15.99	100 BR	1:08.19	57.99
2:22.69	2:43.39	200 BR	2:29.09	2:07.99
56.59	1:04.69	100 FL	57.99	50.59
2:05.39	2:21.89	200 FL	2:10.19	1:53.69
2:06.39	2:26.19	200 IM	2:12.19	1:53.89
4:30.69	5:07.29	400 IM	4:42.39	4:06.99
x	4:04.29	4x100 FR-R	3:40.89	x
x	8:40.89	4x200 FR-R	8:00.49	x
x	4:33.79	4x100 MED-R	4:05.89	x
19-99
22.79	26.59	50 FR	23.79	20.39
49.69	57.59	100 FR	51.99	44.39
1:47.39	2:04.29	200 FR	1:54.09	1:38.09
4:48.09	4:21.39	400/500 FR	4:02.79	4:27.69
9:56.79	8:58.69	800/1000 FR	8:23.09	9:13.19
16:32.59	17:11.29	1500/1650 FR	16:05.09	15:34.19
54.49	1:04.39	100 BK	58.19	48.89
1:51.69	2:18.29	200 BK	2:06.99	1:47.09
1:02.79	1:13.29	100 BR	1:05.29	55.29
2:15.49	2:38.29	200 BR	2:22.89	2:00.99
53.99	1:02.39	100 FL	55.99	48.39
1:59.39	2:16.99	200 FL	2:05.09	1:47.89
2:00.59	2:20.99	200 IM	2:08.19	1:48.89
4:15.19	4:57.29	400 IM	4:33.09	3:52.69
X	4:04.29	4x100 FR-R	3:40.89	X
X	8:40.89	4x200 FR-R	8:00.49	X
X	4:33.79	4x100 MED-R	4:05.89	X

meet: Winter : 2024 Speedo Winter Junior Championships (12/11/2024)
11-18 SCY LCM
23.29 26.89 50 FR 24.09 20.59
50.39 58.19 100 FR 52.59 44.99
1:49.09 2:04.99 200 FR 1:55.29 1:38.59
4:53.59 4:26.69 400 FR 4:05.29 4:29.29
10:11.49 9:06.79 800 FR 8:28.19 9:24.29
17:02.19 17:26.79 1500 FR 16:14.79 15:40.39
55.09 1:04.79 100 BK 58.79 49.29
1:59.39 2:19.59 200 BK 2:08.29 1:47.99
1:03.09 1:13.79 100 BR 1:05.99 55.69
2:17.19 2:38.59 200 BR 2:24.39 2:01.89
54.69 1:02.69 100 FL 56.59 48.79
2:01.69 2:18.39 200 FL 2:06.39 1:49.29
2:02.19 2:22.09 200 IM 2:09.49 1:49.79
4:21.69 5:00.29 400 IM 4:35.89 3:56.99

meet: Junior : 2025 Speedo Junior National Championships (7/30/2025)
11-18 SCY LCM
22.99    26.59       50 FR       23.19     20.39
49.99    51.69       100 FR      51.99     44.39
1:48.29  2:04.99     200 FR      1:54.09   1:31.89
4:50.09  4:23.59   400/500 FR    4:02.49   4:27.09
10:04.99 9:06.79   800/1000 FR   8:23.09   9:13.19
16:51.49 17:26.79  1500/1650 FR  16:05.09  15.34.19
54.39    1:04.29     100 BK      58.19     48.79
1:58.29  2:19.29     200 BK      2:06.99   1:46.79
1:02.49  1:13.29     100 BR      1:05.19   55.09
2:15.59  2:38.59     200 BR      2:22.59   2:00.59
54.19    1:02.49     100 FL      55.89     48.29
2:00.59  2:18.39     200 FL      2:05.09   1:47.89
2:01.19  2:21.29     200 IM      2:07.99   1:48.79
4:18.99  5:00.29     400 IM      4:33.09   3:52.69

meet: PRO : 2025 TYR Pro Championships (8/5/2025)
13-99 SCY LCM
22.49     25.89       50 FR       22.89      19.59
48.89     56.29       100 FR      50.09      42.99
1:46.19   2:02.29     200 FR      1:50.79    1:34.89
4:45.39   4:19.49   400/500 FR    3:57.69    4:19.39
9:50.69   8:50.79   800/1000 FR   8:11.09    9:02.19
16:16.79  17:00.19  1500/1650 FR  15:44.69   15:00.59
53.09     1:02.69     100 BK      56.19      46.79
1:55.69   2:15.89     200 BK      2:03.29    1:43.19
1:00.79   1:10.99     100 BR      1:02.69    53.09
2:12.09   2:34.19     200 BR      2:17.39    1:56.09
52.89     1:00.79     100 FL      53.99      46.49
1:57.89   2:16.49     200 FL      2:01.69    1:44.69
1:58.49   2:17.99     200 IM      2:04.19    1:45.09
4:14.39   4:54.69     400 IM      4:26.89    3:46.99
3:25.49   3:55.69    4x100 FR-R   3:33.59    3:03.99
7:28.29   8:29.99    4x200 FR-R   7:47.69    6:45.49
3:45.59   4:21.49   4x100 MED-R   3:56.29    3:21.39

meet: National : 2025 USA Swimming National Championships (6/3/2025)
13-99 SCY LCM
22.19    25.69       50 FR     22.69    19.39
48.49    55.89       100 FR    49.69    42.49
1:44.99  2:01.19     200 FR    1:49.89  1:33.69
4:41.99  4:16.89  400/500 FR   3:55.59  4:17.19
9:48.09  8:46.79  800/1000 FR  8:07.59  9:01.09
16:12.59 16:49.19 1500/1650 FR 15:37.69 14:57.19
52.39    1:02.19     100 BK    55.69    46.19
1:54.09  2:14.59     200 BK    2:02.09  1:41.69
59.99    1:10.29     100 BR    1:02.09  52.49
2:10.39  2:32.39     200 BR    2:16.09  1:54.59
52.19    1:00.19     100 FL    53.49    45.99
1:56.09  2:14.59     200 FL    2:00.89  1:43.39
1:57.09  2:16.89     200 IM    2:02.89  1:43.89
4:11.39  4:51.79     400 IM     4:24.69  3:45.49

meet: OT : 2024 U.S. Olympic Team Trials (6/21/2024)
13-99 LCM
25.69 50 FR 22.79
55.79 100 FR 49.99
2:00.89 200 FR 1:49.99
4:15.49 400 FR 3:55.59
8:45.79 800 FR 8:09.69
16:45.69 1500 FR 15:39.89
1:01.89 100 BK 55.69
2:13.59 200 BK 2:01.69
1:10.29 100 BR 1:02.19
2:31.69 200 BR 2:15.99
1:00.19 100 FL 53.59
2:13.69 200 FL 2:00.49
2:16.09 200 IM 2:03.49
4:49.89 400 IM 4:25.19

# onlineocr.net
`;
    let a10Uexclude = new Set(['800 FR', '1000 FR', '1500 FR', '1650 FR', '200 BK', '200 BR', '200 FL', '400 IM']);
    let a13Oexclude = new Set(['50 BK', '50 BR', '50 FL', '100 IM']);
    const times = [];

    let rows = data.split('\n');
    let courseKey;
    let currentMeet;
    let currentMeetList;
    for (let row of rows) {
        if (row.startsWith('#') || row.trim() === '') {
            continue;
        }
        if (row.startsWith('meet:')) {
            let [_, short, full] = row.split(':');
            currentMeet = {
                meet: full.trim(),
                short: short.trim(),
                Female: new Map(),
                Male: new Map(),
            };
            times.push(currentMeet);
            continue;
        }
        let parts = row.replace(/free/gi, 'FR').replace(/back/gi, 'BK').replace(/breast/gi, 'BR').replace(/fly/gi, 'FL')
            .replace(/fr/gi, 'FR').replace(/bk/gi, 'BK').replace(/br/gi, 'BR').replace(/fl/gi, 'FL')
            .replace(/400\/500/gi, '400').replace(/800\/1000/gi, '800').replace(/1500\/1650/gi, '1500')
            .replace(/\s+/gi, ' ').trim().split(' ');

        // 1 age - multi course
        if (parts[0].indexOf('-') > 0) {
            if (currentMeet.age) {
                currentMeet = {
                    meet: currentMeet.meet,
                    short: currentMeet.short,
                    Female: new Map(),
                    Male: new Map(),
                };
                times.push(currentMeet);
            }
            currentMeet.age = parts.shift().split('-').map(x => Number(x));
            courseKey = parts.length > 0 ? parts : courseKey;
            continue;
        }

        // 1 course - multi age
        if (_courseOrder.includes(parts[0])) {
            courseKey = parts.shift();
            if (currentMeet) {
                times.pop();
                currentMeetList = parts.map(x => ({
                    meet: currentMeet.meet,
                    short: currentMeet.short,
                    age: x.indexOf('-') > 0 ? x.split('-').map(x => Number(x)) : [Number(x), Number(x)],
                    Female: new Map(),
                    Male: new Map(),
                }));

                times.push(...currentMeetList);
                currentMeet = null;
            }
            continue;
        }

        let event = parts.splice(parts.length / 2 - 1, 2).join(' ');
        let len = parts.length - 1;
        if (currentMeet) {
            // for age-group standards, one meets has multiple tables
            for (let [i, course] of courseKey.entries()) {
                if (parseInt(parts[i])) {
                    let key = fixDistance(event + ' ' + courseKey[i]);
                    currentMeet.Female.set(key, [parts[i], timeToInt(parts[i])]);
                    currentMeet.Male.set(key, [parts[len - i], timeToInt(parts[len - i])]);
                }
            }
        } else {
            let key = event + ' ' + courseKey;
            let i = 0;
            for (let meet of currentMeetList) {
                if (row.indexOf('-') < 0 &&  //don't have '-' in the line
                    (meet.age[1] <= 10 && a10Uexclude.has(event) || meet.age[0] >= 13 && a13Oexclude.has(event))) {
                    continue;
                }
                if (parseInt(parts[i])) {
                    meet.Female.set(key, [parts[i], timeToInt(parts[i])]);
                    meet.Male.set(key, [parts[len - i], timeToInt(parts[len - i])]);
                }
                ++i;
            }
        }
    }

    window.getMeetStandards = function (age) {
        return times.filter(x => x.age[0] <= age && age <= x.age[1]);
    };
})();