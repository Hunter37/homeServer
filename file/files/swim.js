const G = {};

(() => {

    Date.prototype.toDateInputValue = function () {
        let local = new Date(this);
        local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
        return local.toJSON().slice(0, 10);
    };

    Map.prototype.sort = function (compare) {
        let sorted = new Map([...this].sort(compare));
        for (let key in this) {
            sorted[key] = this[key];
        }
        return sorted;
    };

    Map.prototype.reverse = function () {
        let reversed = new Map([...this].reverse());
        for (let key in this) {
            reversed[key] = this[key];
        }
        return reversed;
    };

    Array.prototype.stableSort = function (cmp) {
        let stable = this.map((v, i) => [v, i]);
        stable.sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]);
        return stable.map(v => v[0]);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // shared const

    const _relayOrder = ['BK', 'BR', 'FL', 'FR'];
    const _storkeMap = new Map([
        ['FR', 'Free'],
        ['BK', 'Back'],
        ['BR', 'Breast'],
        ['FL', 'Fly'],
        ['IM', 'IM']]);
    const _strokeIndexMap = new Map([..._storkeMap.keys()].map((item, index) => [item, index]));
    const _meetShortNames = {
        'Futures (LCM)': 'FU',
        'Winter Juniors (SCY)': 'WJ',
        'Summer Juniors (LCM)': 'SJ',
        'Winter US Open (SCY)': 'WO',
        'Winter US Open (LCM)': 'WO',
        'Summer US Open': 'SO',
        'Winter Nationals (LCM)': 'WN',
        'Summer Nationals (LCM)': 'SN',
        'Olympic Trials': 'OT',
        'Olympic Trials Wave I': 'OT1',
        'Olympic Trials Wave II': 'OT2'
    };
    const _1HourInSec = 60 * 60;
    const _1DayInSec = 24 * 60 * 60;
    const _1WeekInSec = 7 * _1DayInSec;
    const _10YearsInSec = 10 * 365 * _1DayInSec;

    const _1DayInMilliSeconds = _1DayInSec * 1000;

    //   0         1            2             3            4             5              6              7            8            9         
    const _eventList = [
        '0 _ _', '50 FR SCY', '100 FR SCY', '200 FR SCY', '500 FR SCY', '1000 FR SCY', '1650 FR SCY', '7 _ _', '8 _ _', '9 _ _',
        '10 _ _', '50 BK SCY', '100 BK SCY', '200 BK SCY', '50 BR SCY', '100 BR SCY', '200 BR SCY', '50 FL SCY', '100 FL SCY', '200 FL SCY',
        '100 IM SCY', '200 IM SCY', '400 IM SCY', '200 FR-R SCY', '400 FR-R SCY', '800 FR-R SCY', '200 MED-R SCY', '400 MED-R SCY', '50 FR SCM', '100 FR SCM',
        '200 FR SCM', '400 FR SCM', '800 FR SCM', '1500 FR SCM', '34 _ _', '35 _ _', '36 _ _', '37 _ _', '50 BK SCM', '100 BK SCM',
        '200 BK SCM', '50 BR SCM', '100 BR SCM', '200 BR SCM', '50 FL SCM', '100 FL SCM', '200 FL SCM', '100 IM SCM', '200 IM SCM', '400 IM SCM',
        '200 FR-R SCM', '400 FR-R SCM', '800 FR-R SCM', '200 MED-R SCM', '400 MED-R SCM', '50 FR LCM', '100 FR LCM', '200 FR LCM', '400 FR LCM', '800 FR LCM',
        '1500 FR LCM', '61 _ _', '62 _ _', '63 _ _', '64 _ _', '50 BK LCM', '100 BK LCM', '200 BK LCM', '50 BR LCM', '100 BR LCM',
        '200 BR LCM', '50 FL LCM', '100 FL LCM', '200 FL LCM', '200 IM LCM', '400 IM LCM', '200 FR-R LCM', '400 FR-R LCM', '800 FR-R LCM', '200 MED-R LCM',
        '400 MED-R LCM', '25 FR SCY', '25 BK SCY', '25 BR SCY', '25 FL SCY', '25 FR SCM', '25 BK SCM', '25 BR SCM', '25 FL SCM', '89 _ _',       // length = 89
        '90 _ _', 'IMR _ SCY', 'IMX _ SCY', 'IMR _ LCM', 'IMX _ LCM'];
    const _eventOrderMap = new Map([
        ['SCY', [81, 1, 2, 3, 4, 5, 6, 82, 11, 12, 13, 83, 14, 15, 16, 84, 17, 18, 19, 20, 21, 22, 91, 92]],
        ['SCM', [85, 28, 29, 30, 31, 32, 33, 86, 38, 39, 40, 87, 41, 42, 43, 88, 44, 45, 46, 47, 48, 49]],
        ['LCM', [55, 56, 57, 58, 59, 60, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 93, 94]]
    ]);
    const _eventIndexMap = new Map(_eventList.map((item, index) => [item, index]));

    // session code (0|Unknown 1|Prelim 2|SwimOff 3|Final 4|SemiFinal 5|QuarterFinal 6|TimedFinal 7|Time Trial)
    // order: unknown, timed, prelim, swimoff, quarter, semi, final, time trial
    //        0        1      2       3        4        5     6      7
    const _sessionOrder = [0, 2, 3, 6, 5, 4, 1, 7];
    const _sessionNames = ['', 'Prelim', 'SwimOff', 'Final', 'SemiFinal', 'QuarterFinal', 'TimedFinal', 'Time Trial'];   // 0 == 'Unknown',

    const starSVG = '<svg viewBox="-1 -1 26 26" stroke-width="1.3"><path d="M4.59 23.5l1.95-8.5039L0 9.27632l8.64-.75658L12 .5l3.36 8.01974 8.64.75658-6.54 5.71978L19.41 23.5 12 18.9908 4.59 23.5Z"/></svg>';
    const gearSVG = '<svg viewBox="0 0 18 18"><path d="M14.98 8.66L17 6.71l-2.02-3.5-2.69.77c-.2-.13-.42-.25-.63-.36L11 1H7l-.66 2.63c-.22.1-.43.22-.63.36l-2.69-.77L1 6.71l2.02 1.95c-.02.41-.02.26 0 .68L1 11.29l2.02 3.5 2.69-.77c.2.13.42.25.63.36L7 17h4l.66-2.63c.22-.11.43-.23.63-.36l2.69.77 2.02-3.5-2.02-1.95c.03-.41.03-.26 0-.67z"/><circle cx="9" cy="9" r="3"/></svg>';
    // const starSVG = '<style>@font-face{font-family:"Icons";src:url(https://res.cdn.office.net/owamail/hashed-v1/resources/fonts/FluentSystemIcons-Resizable-hash-c766c80a.m.woff2)}</style><div style="font-family:Icons;display:inline-block"></div>';
    // const gearSVG = '<style>@font-face{font-family:"Icons";src:url(https://res.cdn.office.net/owamail/hashed-v1/resources/fonts/FluentSystemIcons-Resizable-hash-c766c80a.m.woff2)}</style><div style="font-family:Icons;display:inline-block"></div>';

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // page utility functions

    let _courseOrder;
    let _courseIndexMap;
    courseOrder();

    function isRunningLocally() {
        return location.protocol === 'file:';
    }

    function getFileRoot() {
        return isRunningLocally() ? '' : '/files/';
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

    function timeToInt(stime) {
        let result = 0;
        if (stime) {
            let parts = stime.split(':');
            if (parts.length == 2) {
                result = parseInt(parts[0]) * 6000;
                parts[0] = parts[1];
            }
            parts = (parts[0] + '.00').split('.');
            result += parseInt(parts[0]) * 100 + parseInt(parts[1].padEnd(2, '0'));
        }
        return result;
    }

    function formatTime(time) {
        let min = Math.floor(time / 6000);
        let sec = time % 6000;
        let minStr = min ? (min + ':') : '';
        let secStr = (sec / 100).toFixed(2).padStart(5, '0');
        return minStr + secStr;
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
        if (delta === undefined) {
            return '';
        }
        delta /= 100;
        return (delta > 0 ? '+' : '') + (delta != null ? delta.toFixed(2) : '');
    }

    function decodeAgeKey(ageKey) {
        let from = 0;
        let to = 99;
        if (ageKey.endsWith('U')) {
            to = parseInt(ageKey);
        } else if (ageKey.endsWith('O')) {
            from = parseInt(ageKey);
        } else if (ageKey.includes('-')) {
            let parts = ageKey.split('-');
            from = parseInt(parts[0]);
            to = parseInt(parts[1]);
        } else {
            from = to = parseInt(ageKey);
        }
        return [from, to];
    }

    function ageRangeToAgeKey(from, to) {
        if (!to) {
            return from + '';
        }
        if (from == 0) {
            return to + 'U';
        }
        if (to == 99) {
            return from + 'O';
        }
        return from + '-' + to;
    }

    function getAgeKey(age) {
        age = Math.floor((age + 1) / 2) * 2;
        return age <= 8 ? '8U' : age <= 10 ? '10U' : age > 18 ? '19O' : (age - 1) + '-' + age;
    }

    function convetToGenderString(gender) {
        return ['', 'Female', 'Male'][gender] || 'Unknown';
    }

    function convertToGenderCode(genderStr) {
        return genderStr == 'Male' ? 2 : 1;
    }

    function arrayEqual(a, b, eq) {
        if (a.length != b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!eq(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    let getGlobalName = (() => {
        let count = 0;
        let map = new Map();
        return value => {
            let name = map.get(value);
            if (!name) {
                name = 'F' + count++;
                map.set(value, name);
                window[name] = value;
            }
            return name;
        };
    })();

    function fixDistance(eventStr) {
        let map = {
            '400 FR SCY': '500 FR SCY',
            '500 FR SCM': '400 FR SCM',
            '500 FR LCM': '400 FR LCM',
            '800 FR SCY': '1000 FR SCY',
            '1000 FR SCM': '800 FR SCM',
            '1000 FR LCM': '800 FR LCM',
            '1500 FR SCY': '1650 FR SCY',
            '1650 FR SCM': '1500 FR SCM',
            '1650 FR LCM': '1500 FR LCM'
        };
        return map[eventStr] || eventStr;
    }

    /////////////////////////////////////////////////////////////////////////////
    // local storage functions

    function courseOrder(order) {
        if (!order) {
            let val = localStorage.getItem('course-order') || 'SCY LCM SCM';
            if (!_courseOrder) {
                _courseOrder = val.split(' ');
                _courseIndexMap = new Map(_courseOrder.map((item, index) => [item, index]));
            }
            return val;
        }

        localStorage.setItem('course-order', order);
        _courseOrder = order.split(' ');
        _courseIndexMap = new Map(_courseOrder.map((item, index) => [item, index]));
    }

    function showColor(color) {
        if (color === undefined) {
            color = localStorage.getItem('theme-color') || 'light-mode,default-color';
        } else {
            localStorage.setItem('theme-color', color);
        }

        let colors = new Set(color.split(','));
        for (let elem of document.querySelectorAll('.theme')) {
            elem.disabled = !colors.has(elem.id);
        }

        return color;
    }

    function show25(show) {
        if (show === undefined) {
            return getLocalBoolValue('show25', true);
        }
        setLocalBoolValue('show25', show);
    }

    function useCustomSelect(use) {
        if (use === undefined) {
            return getLocalBoolValue('custom-select', !isNarrowWindow());
        }
        setLocalBoolValue('custom-select', use);

        config();   // refresh config page
    }

    function isNarrowWindow() {
        return window.innerWidth < 1000;
    }

    // function isSafari() {
    //     return  window.safari !== undefined;
    // }

    function useCustomDatePicker(show) {
        if (show === undefined) {
            return getLocalBoolValue('custom-date-picker', isOldBrowser());
        }
        setLocalBoolValue('custom-date-picker', show);
    }

    function isOldBrowser() {
        let oldBrowser = !(navigator.userAgent.indexOf('Chrome/120.') < 0);
        //oldBrowser = true;
        return oldBrowser;
    }

    function getLocalBoolValue(name, defaultValue) {
        let value = localStorage.getItem(name);
        return value === null ? defaultValue : value !== 'false';
    }

    function setLocalBoolValue(name, value) {
        localStorage.setItem(name, value);
    }

    function getMeetDate() {
        return localStorage.getItem('meetDate') || '';
    }

    /////////////////////////////////////////////////////////////////////////////
    // shared data functions

    function removeDataIdx(values, removeKey) {
        let idx = values.idx;
        for (let row of values) {
            row.splice(idx[removeKey], 1);
        }
        for (let key in idx) {
            if (idx[key] > idx[removeKey]) {
                idx[key] -= 1;
            }
        }
        delete idx[removeKey];
    }

    function truncateFetchData(values, maxSize) {
        if (values.length > maxSize) {
            let idx = values.idx;
            let cacheTime = values.cacheTime;
            values = values.slice(0, maxSize);
            values.idx = idx;
            values.cacheTime = cacheTime;
        }
        return values;
    }

    function filterDataBy(values, filter) {
        let idx = values.idx;
        let cacheTime = values.cacheTime;
        values = values.filter(filter);
        values.idx = idx;
        values.cacheTime = cacheTime;
        return values;
    }

    function shortenDateField(values, date) {
        date = values.idx[date || 'date'];
        for (let row of values) {
            row[date] = row[date].substring(0, 10);
        }
    }

    async function appendSubArray(data, fieldName, loader, options) {
        if (!data) {
            return;
        }
        let idx = data.idx;
        let field = idx[fieldName];
        let map = new Map(data.map(r => [r[field], r]));

        let sub = await loader(fieldName, map, options);
        if (!sub) {
            return;
        }

        for (let row of data) {
            row[field] = [];
        }

        let subIdx = sub.idx;
        let subField = subIdx[fieldName];
        for (let item of sub) {
            let row = map.get(item[subField]);
            row[field].push(item);
        }
        data.idx[fieldName + '_Idx'] = subIdx;

        removeDataIdx(sub, fieldName);
    }

    async function convertObject(arr, idx, meetSet) {
        if (!arr) {
            return;
        }
        idx = idx || arr.idx;
        let childrenIdx = [];
        for (let key in idx) {
            if (key.endsWith('_Idx')) {
                childrenIdx.push([key.substring(0, key.length - 4), idx[key]]);
                delete idx[key];
            }
        }

        let result = [];
        let meets = meetSet || new Set();

        for (let row of arr) {
            let obj = {};
            for (let key in idx) {
                obj[key] = row[idx[key]];
            }
            if (obj.meet) {
                meets.add(obj.meet);
            }
            if (obj.time) {
                obj.timeInt = timeToInt(obj.time);
            }
            if (obj.event) {
                obj.eventStr = _eventList[obj.event];
            }

            for (let [field, subIdx] of childrenIdx) {
                obj[field] = await convertObject(obj[field], subIdx, meets);
            }
            result.push(obj);
        }

        if (!meetSet && meets.size) {
            await MeetDictionary.loadMeets(meets);

            for (let obj of result) {
                obj.meetInfo = MeetDictionary.get(obj.meet);
            }
        }

        return result;
    }

    /////////////////////////////////////////////////////////////////////////////
    // UI utility functions

    function createHSpace(px) {
        return `<div style="width:${px}px;display:inline-block"></div>`;
    }

    function createVSpace(px) {
        return `<div style="height:${px}px"></div>`;
    }

    function createClickableDiv(content, action, cls) {
        return `<div class="clickable${cls ? ' ' + cls : ''}" onclick="${action}">${content}</div>`;
    }

    function createPopup(text, popupText, style, additional) {
        if (!text) {
            return '';
        }
        style = style ? ` style="${style}"` : '';

        return [`<span class="bs"${additional}>`, text, `<div class="pop"${style}>`, popupText, '</div></span>'].join('');
    }

    let func = new Map();
    function createCheckbox(id, text, checked, onchange) {
        if (typeof onchange == 'function') {
            func.set(`${id}-onchange`, onchange);
            onchange = ` onchange="${getGlobalName(func)}.get('${id}-onchange')(this.checked)"`;
        } else {
            onchange = onchange ? ` onchange="${onchange}"` : '';
        }
        checked = checked ? ' checked' : '';

        return '<span style="display:inline-block"><span class="checkbox-wrapper">' +
            `<input type="checkbox" id="${id}"${onchange}${checked}><label for="${id}">${text}</label></span></span>`;
    }

    async function createBirthdayCell(pkey, callback, range) {
        range = range || await _birthdayDictionary.load(pkey);
        let loader = new Loading('bday-' + pkey, BirthdayDictionary.format(range),
            (id) => { _backgroundActions.push([loadBirthday, [pkey, id, callback]]); });
        return loader.render();
    }

    async function loadBirthday(params) {
        let [pkey, elemId, callback] = params;
        let data = await loadDetails(pkey);
        if (data) {
            Loading.get(elemId).done(BirthdayDictionary.format(data.swimmer.birthday));
            callback && callback();
        } else {
            Loading.get(elemId).failed();
        }
    }

    function loadScript(src) {
        let id = encodeURIComponent(src);
        let script = document.getElementById(id);
        if (script) {
            return script;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.id = id;

            script.onload = () => {
                resolve(script);
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

    /////////////////////////////////////////////////////////////////////////////
    // runtime cache

    class RuntimeCache {
        static map = new Map();
        static async func(key, func) {
            let data = RuntimeCache.map.get(key);
            if (data || RuntimeCache.map.has(key)) {
                // the value could be undefined, so we need to use has() to check
                return data;
            }

            data = await func();

            RuntimeCache.map.set(key, data);
            return data;
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // local caches

    class LocalCache {
        static currentVersion = 7;

        static enable(yes) {
            if (typeof yes === 'boolean') {
                setLocalBoolValue('use-local-cache', yes);
            }

            return getLocalBoolValue('use-local-cache', true);
        }

        static set(key, value) {
            let cacheTime = value.cacheTime;
            delete value.cacheTime;
            ldb.set(key, {
                time: cacheTime || new Date(),
                data: value,
                version: LocalCache.currentVersion
            });
        }

        static async get(key, timeoutInSec, minVersion) {
            if (!LocalCache.enable()) {
                return null;
            }

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
                if (!data) {
                    throw e;
                }
                console.log('Using old data for:', key);
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
        constructor() {
            this.dict = new Map();
        }

        static async _load(lsc) {
            return await LocalCache.func('clubs/' + lsc, async () => {
                let bodyObj = {
                    metadata: [
                        {
                            title: 'clubName',
                            dim: '[OrgUnit.Level4Name]'
                        },
                        {
                            title: 'club',
                            dim: '[OrgUnit.Level4Code]'
                        },
                        {
                            dim: "[UsasSwimTime.SwimEventKey]",
                            filter: {
                                equals: 1
                            },
                            panel: 'scope'
                        },
                        {
                            dim: '[OrgUnit.Level3Code]',
                            filter: {
                                equals: lsc
                            },
                            panel: 'scope'
                        }
                    ],
                    count: 5000
                };

                return await fetchSwimValues(bodyObj, 'event');
            }, _1WeekInSec, 3);
        }

        async loadClubMap(lsc) {
            let map = this.dict.get(lsc);
            if (!map) {

                let data = await ClubDictinary._load(lsc);
                if (data) {
                    map = new Map(data);

                    this.dict.set(lsc, map);
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
        static _dict = new Map();

        static get(meet) {
            return MeetDictionary._dict.get(meet);
        }

        static async _load(meets) {
            let bodyObj = {
                metadata: [
                    {
                        title: 'meet',
                        dim: '[UsasSwimTime.MeetKey]',
                        filter: {
                            members: [...meets]
                        }
                    },
                    {
                        title: 'date',
                        dim: '[SeasonCalendar.CalendarDate (Calendar)]',
                        level: 'days',
                        sort: 'asc'
                    },
                    {
                        title: 'name',
                        dim: '[Meet.MeetName]'
                    }
                ],
                count: meets.size * 5
            };

            let data = await fetchSwimValues(bodyObj, 'event');
            if (!data) {
                return;
            }

            // only keep the first meet date as meet start date
            let result = [];
            result.idx = data.idx;
            let idxMeet = data.idx.meet;
            for (let row of data) {
                let meet = row[idxMeet];
                if (meets.has(meet)) {
                    meets.delete(meet);
                    result.push(row);
                }
            }

            shortenDateField(result);

            return result;
        }

        static async _loadCached(meets) {
            let result = [];
            for (let meet of meets) {
                let key = 'meet/' + meet;
                let data = await LocalCache.get(key, _10YearsInSec);
                if (data) {
                    let [date, name] = data;
                    result.push([meet, date, name]);
                    meets.delete(meet);
                }
            }

            if (meets.size == 0) {
                return result;
            }

            let data = await MeetDictionary._load(meets);
            if (data) {
                let idx = data.idx;
                for (let row of data) {
                    let meet = row[idx.meet];
                    let date = row[idx.date];
                    let name = row[idx.name];
                    result.push([meet, date, name]);
                    LocalCache.set('meet/' + meet, [date, name]);
                }
            }

            return result;
        }

        static async loadMeets(meets) {
            let meetsToLoad = new Set([...meets].filter(meet => !MeetDictionary._dict.has(meet)));

            let data = await MeetDictionary._loadCached(meetsToLoad);
            if (data) {
                for (let [meet, date, name] of data) {
                    MeetDictionary._dict.set(meet, { date, name });
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // birthday dictionary

    class BirthdayDictionary {
        async load(pkey) {
            let key = 'bday/' + pkey;
            return await RuntimeCache.func(key, async () => {
                return await LocalCache.get(key, _10YearsInSec);
            });
        }

        calculate(pkey, events, age) {
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
                let meetInfo = MeetDictionary.get(row.meet);
                let meetAge = row.age;
                let d = new Date(meetInfo.date);
                d.setUTCFullYear(d.getUTCFullYear() - meetAge, d.getUTCMonth(), d.getUTCDate());
                right = min(d, right);
                d = new Date(meetInfo.date);
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
            let key = 'bday/' + pkey;
            LocalCache.set(key, range);
            RuntimeCache.map.set(key, range);

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
    // tab view

    class TabView {
        constructor(id) {
            this.id = id;
            this.tabs = [];
            this.views = [];
        }

        addTab(name, view) {
            this.tabs.push(name);
            this.views.push(view);
        }

        render(index) {
            index = index || 0;
            let html = [];

            html.push(`<div class="tabview" id="${this.id}">`);

            html.push('<div class="tabs">');
            for (let i = 0; i < this.tabs.length; ++i) {
                html.push(`<div class="tab clickable${i == index ? ' selected' : ''}" onclick="${getGlobalName(TabView)}.tab('${this.id}', ${i})">${this.tabs[i]}</div>`);
            }
            html.push('</div>');

            for (let i = 0; i < this.views.length; ++i) {
                html.push(`<div class="view ${i == index ? '' : 'hide'}">${this.views[i]}</div>`);
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
    // expander class

    class Expander {
        static expanders = new Map();
        static get(id) {
            return Expander.expanders.get(id);
        }

        constructor(id, expand, fold, content) {
            this.id = id;
            this.expandHeader = expand;
            this.foldHeader = fold;
            this.content = content;

            Expander.expanders.set(id, this);
        }

        render() {
            return `<div class="expander" id="${this.id}"><div class="expand clickable" onclick="${getGlobalName(Expander)}.get('${this.id}').expand()">${this.expandHeader}</div>` +
                `<div class="fold clickable hide" onclick="${getGlobalName(Expander)}.get('${this.id}').fold()">${this.foldHeader}</div><div class="exp-content hide">${this.content}</div></div>`;
        }

        expand() {
            document.querySelector(`#${this.id}>.expand`).classList.add("hide");
            document.querySelectorAll(`#${this.id}>.fold,#${this.id}>.exp-content`).forEach(e => e.classList.remove("hide"));
        }

        fold() {
            document.querySelector(`#${this.id}>.expand`).classList.remove("hide");
            document.querySelectorAll(`#${this.id}>.fold,#${this.id}>.exp-content`).forEach(e => e.classList.add("hide"));
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // dropdown class
    class Dropdown {
        static dropdowns = new Map();
        static get(id) {
            return Dropdown.dropdowns.get(id);
        }

        constructor(id, triggerElem, content) {
            this.id = id;
            this.triggerElem = triggerElem;
            this.content = content;
            this.onopen = null;

            Dropdown.dropdowns.set(id, this);
        }

        render() {
            return `<table id="${this.id}" class="fill drop-layout"><tbody><tr><td onclick="${getGlobalName(Dropdown)}.get('${this.id}').click()">${this.triggerElem}</td></tr>`
                + `<tr><td style="position:relative"><div><div class="dropdown hide">${this.content}</div></div></td></tr></tbody></table>`;
        }

        click() {
            if (document.querySelector(`#${this.id} .dropdown`).classList.contains('hide')) {
                this.open();
            } else {
                this.close();
            }
        }

        open() {
            document.querySelector(`#${this.id} .dropdown`).classList.remove('hide');
            this.closing = (e) => {
                if (!e.target.closest(`#${this.id}`)) {
                    this.close();
                }
            }

            window.addEventListener('click', this.closing);
            window.addEventListener('touchstart', this.closing);
            this.onopen && this.onopen();
        }

        close() {
            window.removeEventListener('click', this.closing);
            window.removeEventListener('touchstart', this.closing);
            document.querySelector(`#${this.id} .dropdown`)?.classList.add('hide');
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // select class
    class Select {
        id;
        values;
        selected;
        onchange;
        dropdown;
        static dict = new Map();
        static get(id) {
            return Select.dict.get(id);
        }

        constructor(id, values, selected, onchange) {
            this.id = id;
            this.values = values;
            this.selected = selected;
            this.onchange = onchange;
            this.style = '';
            this.class = '';
            this.valueEqualtoSelection = (a, b) => a === b;

            Select.dict.set(id, this);
        }

        select(value) {
            // clean list selection
            let root = document.getElementById(this.id);

            for (let i = 0; i < this.values.length; ++i) {
                let elem = root.querySelector('.o' + i);
                elem.classList.remove('selected');
            }

            // change selection & highlight selected item
            this.selected = value;
            let text = '';
            for (let [i, [txt, val]] of this.values.entries()) {
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
            document.getElementById(this.id + '-text').innerHTML = text;
            this.dropdown.close();
            this.onchange(value);
        }

        onclickItem(index) {
            this.select(this.values[index][1]);
        }

        renderCustom() {
            let cls = this.class ? ` ${this.class}` : '';
            let style = this.style ? ` style="${this.style}"` : '';
            let text = '';
            for (let value of this.values) {
                if (value.length == 1) {
                    value.push(undefined);
                }
                if (value[1] === this.selected) {
                    text = value[0];
                }
            }
            let elem = `<div class='select-text clickable${cls}' id="${this.id}-text"${style}>${text}</div>`;

            let options = [`<div id="${this.id}">`];
            let ending = '';
            for (let [i, [txt, val]] of this.values.entries()) {
                if (val === undefined) {
                    options.push(ending);
                    options.push(`<div class="group"><div onclick="event.stopPropagation()" class="o${i} group-txt">${txt}</div>`);
                    ending = '</div>';
                } else {
                    let selected = this.valueEqualtoSelection(this.selected, val) ? ' selected' : '';
                    options.push(`<div onclick="${getGlobalName(Select)}.get('${this.id}').onclickItem(${i})" class="o${i} option clickable${selected}${cls}">${txt || '&nbsp;'}</div>`);
                }
            }
            options.push(ending, '</div>');

            this.dropdown = new Dropdown(this.id, elem, options.join(''));
            this.dropdown.onopen = () => {
                let root = document.getElementById(this.id);
                let index = this.values.findIndex(v => v[1] === this.selected);
                if (index >= 0) {
                    let elem = root.querySelector('.o' + index);
                    elem.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
                }
            }
            return this.dropdown.render();
        }

        render(custom) {
            if (custom) {
                return this.renderCustom();
            }

            let html = [];
            let cls = this.class ? ` class="${this.class}"` : '';
            let ending = '';
            html.push(`<select${cls} onchange="${getGlobalName(Select)}.get('${this.id}').onselect(this.value)">`);
            for (let [txt, val] of this.values) {
                if (val === undefined) {
                    html.push(ending);
                    html.push(`<optgroup label="${txt}">`);
                    ending = '</optgroup>';
                } else {
                    let selectedCls = this.valueEqualtoSelection(this.selected, val) ? ' class="selected"' : '';
                    let selected = val === this.selected ? ' selected' : '';
                    html.push(`<option value="${val}"${selectedCls}${selected}>${txt}</option>`);
                }
            }

            html.push(`${ending}</select>`);
            return html.join('');
        }

        onselect(value) {
            this.onchange(value);
        }
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // loading spinner
    class Loading {
        static dict = new Map();
        static get(id) {
            return Loading.dict.get(id);
        }

        constructor(id, content, loadFunc) {
            this.id = id;
            this.content = content;
            this.loadFunc = loadFunc;
            this.status = 'init';
            Loading.dict.set(id, this);
        }

        render() {
            return `<span id="${this.id}" class="clickable no-dec" onclick="${getGlobalName(Loading)}.get('${this.id}').loading()">${this.content}</span>`;
        }

        loading() {
            if (this.status == 'init') {
                this.status = 'loading';
                document.getElementById(this.id).innerHTML = '<div class="loader"></div>';
                this.loadFunc(this.id);
            }
        }

        done(content) {
            if (this.status != 'done') {
                this.status = 'done';
                let elem = document.getElementById(this.id);
                elem.innerHTML = content;
                elem.classList.remove('clickable');
            }
        }

        failed() {
            if (this.status == 'loading') {
                this.status = 'init';
                let elem = document.getElementById(this.id);
                elem.innerHTML = this.content;
                elem.classList.add('clickable');
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // double range class

    class DoubleRange {

        static dict = new Map();
        static get(id) {
            return DoubleRange.dict.get(id);
        }

        constructor(id, min, max, value1, value2, minGap, onchange) {
            this.id = id;
            this.onchange = onchange || (() => { });
            this._setValues(min, max, value1, value2, minGap);
            DoubleRange.dict.set(id, this);
        }

        getValues() {
            return [this.min, this.max, this.minGap, this.value1, this.value2];
        }

        setValues(min, max, value1, value2, minGap) {
            this._setValues(min, max, value1, value2, minGap);

            let root = document.getElementById(this.id);
            let left = root.querySelectorAll('input[type="range"]')[0];
            let right = root.querySelectorAll('input[type="range"]')[1];
            left.min = right.min = this.min;
            left.max = right.max = this.max;
            left.value = this.value1;
            right.value = this.value2;
            this.fillColor();
        }

        _setValues(min, max, value1, value2, minGap) {
            this.min = min;
            this.max = Math.max(max, min + minGap);
            this.value1 = Math.max(min, Math.min(max - minGap, value1));
            this.value2 = Math.max(this.value1 + minGap, Math.min(max, value2));;
            this.minGap = minGap || 0;
        }

        render() {
            let percent1 = (((this.value1 - this.min) / (this.max - this.min)) * 100).toFixed(2);
            let percent2 = (((this.value2 - this.min) / (this.max - this.min)) * 100).toFixed(2);
            let background = `linear-gradient(to right, var(--b3-clr) ${percent1}%, var(--ctrl-bk-clr) ${percent1}%, var(--ctrl-bk-clr) ${percent2}%, var(--b3-clr) ${percent2}%)`;

            return [
                `<div id="${this.id}" class="double-range"><div class="slider-track" style="background:${background}"></div>`,
                `<input type="range" min="${this.min}" max="${this.max}" value="${this.value1}" oninput="${getGlobalName(DoubleRange)}.get('${this.id}').slideOne(this)">`,
                `<input type="range" min="${this.min}" max="${this.max}" value="${this.value2}" oninput="${getGlobalName(DoubleRange)}.get('${this.id}').slideTwo(this)">`,
                '</div>'].join('');
        }

        slideOne(e, event) {
            let value = e.value = Math.min(e.value, this.value2 - this.minGap);
            if (value != this.value1) {
                this.value1 = value;
                this.onchange(this, this.value1, this.value2);
                this.fillColor();
            }
        }

        slideTwo(e, event) {
            let value = e.value = Math.max(e.value, this.value1 + this.minGap);
            if (value != this.value2) {
                this.value2 = value;
                this.onchange(this, this.value1, this.value2);
                this.fillColor();
            }
        }

        fillColor() {
            this.sliderTrack = this.sliderTrack || document.querySelector(`#${this.id}>.slider-track`);
            let range = 100 / (this.max - this.min);
            let percent1 = ((this.value1 - this.min) * range).toFixed(2);
            let percent2 = ((this.value2 - this.min) * range).toFixed(2);
            this.sliderTrack.style.background = `linear-gradient(to right, var(--b3-clr) ${percent1}%, var(--ctrl-bk-clr) ${percent1}%, var(--ctrl-bk-clr) ${percent2}%, var(--b3-clr) ${percent2}%)`;
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // usa swimming data fetch utility functions

    function useProxy(yes) {
        if (typeof yes === 'boolean') {
            setLocalBoolValue('use-proxy', yes);
        }

        return getLocalBoolValue('use-proxy', true);
    }

    async function fetchSwimValues(bodyObj, type) {
        let map = {
            swimmer: 'https://usaswimming.sisense.com/api/datasources/Public Person Search/jaql',
            event: 'https://usaswimming.sisense.com/api/datasources/USA Swimming Times Elasticube/jaql',
            club: 'https://usaswimming.sisense.com/api/datasources/Club Performance Elasticube/jaql',
            split: 'https://usaswimming.sisense.com/api/datasources/Splits/jaql',
            // meet: 'https://usaswimming.sisense.com/api/datasources/Meets/jaql'
        }

        let response;
        for (let retry = 0; retry < 2; ++retry) {
            let headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                // 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjY0YmE2NmE5M2ZiYTUwMDM4NWIyMWQwIiwiYXBpU2VjcmV0IjoiNDQ0YTE3NWQtM2I1OC03NDhhLTVlMGEtYTVhZDE2MmRmODJlIiwiYWxsb3dlZFRlbmFudHMiOlsiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIl0sInRlbmFudElkIjoiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIn0.izSIvaD2udKTs3QRngla1Aw23kZVyoq7Xh23AbPUw1M'
            };

            let url = map[type || 'swimmer'];

            if (useProxy()) {
                url = (localStorage.getItem('proxy-server') || '') + '/q?url=' + encodeURIComponent(url);

                let ttl = localStorage.getItem('cache-ttl') || 0;
                if (ttl) {
                    headers['X-Cache-TTL'] = ttl;
                }
            }

            let fetchTimeout = parseInt(localStorage.getItem('fetch-timeout')) || 10_000;

            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                signal: AbortSignal.timeout(fetchTimeout),
                body: JSON.stringify(bodyObj)
            });

            if (response.ok) {
                break;
            }

            if (response.status == 401) {
                console.warn(response.statusText, await response.text());
                await ensureToken(true);
                continue;
            }

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
        let cacheTime = response.headers.get("X-Cache-Date");
        data.values.cacheTime = cacheTime ? new Date(cacheTime) : new Date();

        return data.values;
    }

    async function fetchToken() {
        let tokenCall = async (url, bodyObj) => {
            // fetch token must use proxy, otherwise it will be blocked by CORS
            url = (localStorage.getItem('proxy-server') || '') + '/q?url=' + encodeURIComponent(url);

            let fetchTimeout = parseInt(localStorage.getItem('fetch-timeout')) || 5_000;

            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache-TTL': 10
                },
                signal: AbortSignal.timeout(fetchTimeout),
                body: JSON.stringify(bodyObj)
            });

            if (!response.ok) {
                return;
            }

            return await response.json();
        };

        let getIpAddress = async () => {

            // use 1 week old ip address if available
            let ip = await LocalCache.get('ip', _1WeekInSec);

            // but alway try to get the latest ip address in the background within 1 hour
            let promise = LocalCache.func('ip', async () => {
                // for (let url of ['https://icanhazip.com', 'https://api.ipify.org', 'https://ifconfig.me/ip']) {
                for (let url of ['https://api.ipify.org', 'https://ipv4.icanhazip.com']) {
                    try {
                        let response = await fetch(url);
                        //await (new Promise(r => setTimeout(r, _1DayInMilliSeconds))); // test api call delay
                        if (response.ok) {
                            return (await response.text()).trim();
                        }
                    } catch (_) { }
                }
                return '169.254.130.1';
            }, _1HourInSec);

            return ip || await promise;
        }

        let MurmurHash = a => {
            const t = a.length & 3
                , s = a.length - t
                , n = 3432918353
                , o = 461845907;
            let r, i, l;
            for (let m = 0; m < s; m++)
                l = a.charCodeAt(m) & 255 | (a.charCodeAt(++m) & 255) << 8 | (a.charCodeAt(++m) & 255) << 16 | (a.charCodeAt(++m) & 255) << 24,
                    ++m,
                    l = (l & 65535) * n + (((l >>> 16) * n & 65535) << 16) & 4294967295,
                    l = l << 15 | l >>> 17,
                    l = (l & 65535) * o + (((l >>> 16) * o & 65535) << 16) & 4294967295,
                    r ^= l,
                    r = r << 13 | r >>> 19,
                    i = (r & 65535) * 5 + (((r >>> 16) * 5 & 65535) << 16) & 4294967295,
                    r = (i & 65535) + 27492 + (((i >>> 16) + 58964 & 65535) << 16);
            const d = s - 1;
            switch (l = 0, t) {
                case 3:
                    {
                        l ^= (a.charCodeAt(d + 2) & 255) << 16;
                        break
                    }
                case 2:
                    {
                        l ^= (a.charCodeAt(d + 1) & 255) << 8;
                        break
                    }
                case 1:
                    {
                        l ^= a.charCodeAt(d) & 255;
                        break
                    }
            }
            return l = (l & 65535) * n + (((l >>> 16) * n & 65535) << 16) & 4294967295,
                l = l << 15 | l >>> 17,
                l = (l & 65535) * o + (((l >>> 16) * o & 65535) << 16) & 4294967295,
                r ^= l,
                r ^= a.length,
                r ^= r >>> 16,
                r = (r & 65535) * 2246822507 + (((r >>> 16) * 2246822507 & 65535) << 16) & 4294967295,
                r ^= r >>> 13,
                r = (r & 65535) * 3266489909 + (((r >>> 16) * 3266489909 & 65535) << 16) & 4294967295,
                r ^= r >>> 16,
                r >>> 0
        };

        let ip2dec = ip => ip.split('.').reduce((s, i) => (s << 8) + parseInt(i), 0) >>> 0;

        let ip = await getIpAddress();
        let deviceId = MurmurHash(ip + location.toString() + navigator.userAgent);
        let hostId = btoa(ip2dec(ip));

        let data = await tokenCall('https://securityapi.usaswimming.org/security/Auth/GetSecurityInfoForToken',
            { toxonomies: [], appName: 'Data', deviceId: deviceId, uIProjectName: 'times-microsite-ui', hostId: hostId, bustCache: false, scope: 'Project' });

        let requestId = parseInt(data?.requestId);

        data = await tokenCall('https://securityapi.usaswimming.org/security/DataHubAuth/GetSisenseAuthToken',
            { sessionId: requestId * 13, deviceId: deviceId, hostId: hostId, requestUrl: '/datahub' });

        return data?.accessToken;
    }

    let token;
    async function ensureToken(force) {
        if (token && !force) {
            return;
        }
        token = await fetchToken();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // initial page

    class TopButton {
        static key;
        static pkey;
        static onClick(button) {
            let id = button + '-button';
            let classList = document.getElementById(id).classList;
            if (classList.contains('disabled')) {
                return;
            }

            if (['relay', 'rank'].includes(button)) {
                TopButton.key = TopButton.key || localStorage.getItem('last-rank-key');
                if (TopButton.key) {
                    if ('rank' == button) {
                        goRankWithPkey(TopButton.key, TopButton.pkey);
                    } else {
                        go(button, TopButton.key);
                    }
                }
            } else {
                go(button);
            }
        }

        static show(button, param) {
            let id = button + '-button';
            let classList = document.getElementById(id).classList;

            if (['relay', 'rank'].includes(button)) {
                if (typeof param == 'string') {
                    TopButton.key = param;
                    localStorage.setItem('last-rank-key', param);
                    param = true;
                }

                param = param && localStorage.getItem('last-rank-key');
            }

            if (param) {
                classList.remove('disabled');
            } else {
                classList.add('disabled');
            }
        }
    }

    (() => {
        let drop = new Dropdown('main-search',
            '<div class="drop clickable"><div style="margin:auto">▽</div></div>',
            `<button onclick="${getGlobalName(go)}('search',document.getElementById('input').value+'~19O');${getGlobalName(Dropdown)}.get('main-search').close();" style="width:100%">SEARCH 19&OVER</button>`);

        let html = ['<div class="center-row search-bar">',
            `<input type="text" id="input" onkeypress="event.key=='Enter'&&${getGlobalName(go)}('search',this.value)" autofocus>`,
            `<button onclick="${getGlobalName(go)}('search',document.getElementById('input').value)" class="search">SEARCH</button>`,
            drop.render(),
            `<button id="rank-button" onclick="${getGlobalName(TopButton)}.onClick('rank')">RANK</button>`,
            `<button id="relay-button" onclick="${getGlobalName(TopButton)}.onClick('relay')">RELAY</button>`,
            `<button id="favorite-button" onclick="${getGlobalName(TopButton)}.onClick('favorite')" class="sq-btn">${starSVG}</button>`,
            `<button id="config-button" onclick="${getGlobalName(TopButton)}.onClick('config')" class="sq-btn">${gearSVG}</button>`,
            '</div>',
            '<div id="content" class="container"></div>',
            '<div id="mloading" class="mback hide"><span class="mloader">Loading</span></div>'
        ];

        document.body.innerHTML = html.join('');
    })();

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // navigation and routing functions

    function go(action, value) {
        value = value ? '/' + encodeURIComponent(value) : '';
        window.location.hash = '#' + action + value;
    }

    function updateContent(html, loadingHash) {
        if (window.location.hash.substring(1) == loadingHash) {
            document.getElementById('content').innerHTML = html;
            document.getElementById('mloading').classList.add('hide');
        } else {
            console.warn('Content is outdated:', loadingHash);
        }
    }

    window.addEventListener('hashchange', loadContent);
    window.addEventListener('load', loadContent);

    function createDefaultPage() {
        return [`<div>Please enter the swimmer's name or the club name in the search box.</div>`,
            // `<div style="margin:12px -18px;height:900px;position:relative;"><img src="https://img.goodfon.com/original/1920x1200/6/81/swimming-pool-water-underwater-olympic-swimming-pool-swimmin.jpg" style="object-fit:cover;width:100%;height:100%;"></div>`
        ].join('');
    }

    let _navFuncMap = new Map();
    let _title = "Swim Info";

    async function loadContent() {
        _backgroundActions.length = 0;
        showColor();

        document.title = _title;
        TopButton.show('favorite', true);
        TopButton.show('config', true);
        TopButton.show('relay', true);
        TopButton.show('rank', true);

        let loadingHash = window.location.hash.substring(1);
        if (!loadingHash) {
            updateContent(createDefaultPage(), loadingHash);
            return;
        }

        document.getElementById('mloading').classList.remove('hide');

        let [action, value] = loadingHash.split('/');
        value = value && decodeURIComponent(value);

        let func = _navFuncMap.get(action);
        if (func) {
            try {
                await func(value);
            } catch (e) {
                let message = e.stack;
                if (e.name == 'TimeoutError') {
                    message = 'Please refresh the page.<br><br>' + message;
                }
                updateContent(message, loadingHash);
            }
        } else {
            window.location.replace('');
        }
    }

    const _backgroundActions = [];
    (() => {
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
    })();

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // favorite swimmer page
    //🔧⚙🩷♥🩶❤🤍🏳🏴🔧🛠★⛓‍💥❌🔽🔼△▽

    async function favorite() {
        document.title = _title + ' - Favorites';
        TopButton.show('favorite', false);

        let loadingHash = 'favorite';
        let values = Favorite.get();

        let html = ['<h2>Favorites</h2>'];

        if (values.size == 0) {
            html.push('<p>No favorites yet. Go to the swimmer page and tap <span style="display:inline-block;fill:#CCC;width:24px;transform:translateY(7px)">',
                starSVG, '</span> next to a swimmer\'s name to add.</p>');
        } else {
            html.push('<div class="fav-content">',
                `<input id="fav-filter" type="text" placeholder="search in favorites" oninput="${getGlobalName(filterFavorite)}(this.value)">`,
                '<div id="fav-table">', createFavoriteTable(values), '</div></div>');
        }

        updateContent(html.join(''), loadingHash);
    }
    _navFuncMap.set('favorite', favorite);

    function createFavoriteTable(values) {
        let html = ['<table class="fill top-margin"><tbody><tr><th></th>'];
        for (let e of ['Name', 'Age', 'Club', 'LSC']) {
            html.push(`<th class="clickable" onclick="${getGlobalName(Favorite)}.sort('${e}');${getGlobalName(filterFavorite)}()">${e}</th>`);
        }
        html.push('</tr>');
        for (let [pkey, obj] of values) {
            html.push(`<tr class="clickable" onclick="${getGlobalName(go)}('swimmer', ${pkey})"><td onclick="event.stopPropagation()">`, Favorite.createButton(pkey, obj.name, obj.age, obj.club, obj.lsc),
                '</td><td class="left">', obj.name, '</td><td>', obj.age, '</td><td class="left">', obj.club, '</td><td class="left">', obj.lsc, '</td></tr>');
        }
        html.push('</tbody></table>');

        return html.join('');
    }

    function filterFavorite(filter) {
        filter = filter || document.getElementById('fav-filter').value;

        let values = Favorite.get();

        if (filter && (filter = filter.trim())) {
            filter = filter.toLowerCase();
            values = new Map([...values].filter(([pkey, obj]) => obj.name.toLowerCase().includes(filter)));
        }

        document.getElementById('fav-table').innerHTML = createFavoriteTable(values);
    }

    class Favorite {
        static createButton(pkey, name, age, clubName, lsc) {
            let cls = Favorite.has(pkey) ? ' selected' : '';
            return createPopup(`<div class="add-fav clickable ${cls}" onclick="${getGlobalName(Favorite)}.click(this,${pkey},\`${name}\`,${age},\`${clubName}\`,'${lsc}')">${starSVG}</div>`, 'Add to Favorite');
        }

        static click(elem, pkey, name, age, clubName, lsc) {
            elem.classList.toggle('selected');
            let favorites = new Map(JSON.parse(localStorage.getItem('favorites')));
            if (favorites.has(pkey)) {
                favorites.delete(pkey);
            } else {
                favorites.set(pkey, { name: name, age: age, club: clubName, lsc: lsc });
            }
            Favorite._save(favorites);
        }

        static set(pkey, name, age, clubName, lsc) {
            let favorites = new Map(JSON.parse(localStorage.getItem('favorites')));
            favorites.set(pkey, { name: name, age: age, club: clubName, lsc: lsc });
            Favorite._save(favorites);
        }

        static has(pkey) {
            let favorites = Favorite.get();
            return favorites.has(pkey);
        }

        static get() {
            return new Map(JSON.parse(localStorage.getItem('favorites')));
        }

        static _save(favorites) {
            localStorage.setItem('favorites', JSON.stringify([...favorites]));
        }

        static sort(by) {
            by = by.toLowerCase();
            let values = Favorite.get();
            values = [...values];
            let sorted = values.stableSort((a, b) => a[1][by] == b[1][by] ? 0 : a[1][by] > b[1][by] ? 1 : -1);
            if (arrayEqual(sorted, values, (a, b) => a[0] == b[0])) {
                sorted = values.stableSort((a, b) => a[1][by] == b[1][by] ? 0 : a[1][by] < b[1][by] ? 1 : -1);
            }

            Favorite._save(sorted);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // set / del page
    async function set(params) {
        let part = params.split('=');
        localStorage.setItem(part[0], part[1]);
        history.back();
    }
    _navFuncMap.set('set', set);

    async function del(params) {
        localStorage.removeItem(params);
        history.back();
    }
    _navFuncMap.set('del', del);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // test page
    async function test(params) {
        let tabView = new TabView('configTabView');
        tabView.addTab('<p>About</p>', '<pre>set/xbday=10\nset/cache-ttl=86400\n\nset/use-proxy=true\nset/use-local-cache=true\nset/fetch-timeout=10000</pre>');

        updateContent(tabView.render(), 'test');
    }
    _navFuncMap.set('test', test);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // config page

    async function config(params) {
        document.title = _title + ' - Config';
        TopButton.show('config', false);

        let loadingHash = 'config' + (params ? '/' + params : '');
        let index = { about: 1, cache: 2, token: 2 }[params] || 0;

        let tabView = new TabView('configTabView');

        tabView.addTab('<p>CONFIG</p>', buildConfigPage());
        tabView.addTab('<p>ABOUT</p>', buildAboutPage());

        if (params == 'cache') {
            tabView.addTab('<p>CACHE</p>', buildCachePage());
        }

        if (params == 'token') {
            tabView.addTab('<p>TOKEN</p>', await buildTokenPage());
        }

        updateContent(tabView.render(index), loadingHash);
    }
    _navFuncMap.set('config', config);

    async function buildTokenPage() {
        await ensureToken(true);
        return [
            '<div class="top-margin">',
            `<textarea style="width:100%;height:200px" oninput="G.token=this.value">`, token, '</textarea>',
            `<button onclick="let t=document.querySelector('textarea');t.select();navigator.clipboard.writeText(t.value);">Copy Token</button>`,
            '</div>',
        ].join('');
    }

    function buildCachePage() {
        return [
            '<div class="top-margin">',
            createCheckbox('use-local-cache-checkbox', 'Local Cache', LocalCache.enable(), `${getGlobalName(LocalCache)}.enable(this.checked)`),
            '</div><div class="top-margin">',
            createCheckbox('use-proxy-checkbox',
                `Proxy <input oninput="localStorage.setItem('proxy-server',this.value)" value="${localStorage.getItem('proxy-server') || window.location.origin}">`,
                useProxy(), `${getGlobalName(useProxy)}(this.checked)`),
            '</div>',
            `<div class="center-row"><input id="cache-key"><button onclick="${getGlobalName(clearCache)}()">Clear App Cache</button><button onclick="${getGlobalName(clearCache)}(this)">Show Cache</button></div><div id="cache-info"></div>`
        ].join('');
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
    }

    function buildAboutPage() {
        return ['<div style="padding:30px" style="max-width:800px">',

            '<h3>About</h3>',
            '<p>Welcome to our website, a non-profit project dedicated to supporting swimmers and coaches.</p>',
            `<p>Our platform makes it easy to check swimmers' event results, track progress, and plan for future meets.</p>`,
            '<p>All swimmer data is sourced from official public records to ensure accuracy and accessibility.</p>',
            '<p>We value your feedback! If you encounter any issues, please report them to us at ',
            '<a href="mailto:swim.ajzxhub.net@gmail.com?body=Bug&subject=Bug Report">Bug Report</a>.</p>',
            `<p>Have suggestions? We'd love to hear them at `,
            '<a href="mailto:swim.ajzxhub.net@gmail.com?subject=Suggestion">Suggestion</a>.',
            '<p>For general inquiries, contact us at <a href="mailto:swim.ajzxhub.net@gmail.com?subject=Questions">Contact us</a>.</p>',
            '<p>Thank you for visiting, and we hope our site helps you achieve your goals in the pool!</p>',

            '<h3 style="margin-top:80px">Privacy Statement</h3>',
            '<p>We are committed to protecting your privacy. Our service does not collect or store any user information.</p>',
            '<p>All usage data and favorites are stored locally in your browser, keeping your information private and secure.</p>',

            '</div>'].join('');
    }

    function buildConfigPage() {
        let html = [
            '<div style="padding:30px 10px;max-width:800px">',
            createVSpace(30),
            '<div class="center-row">', createCheckbox('show-25', 'Show 25-Yard Events', show25(), `${getGlobalName(show25)}(this.checked)`),
            '<span style="padding:0 20px;">(Display 25-yard/meter events for swimmers aged 9 and over)</span></div>',
            createVSpace(30),
            '<div class="center-row">', createCheckbox('custom-select', 'Use Custom Select Control', useCustomSelect(), `${getGlobalName(useCustomSelect)}(this.checked)`),
            '<span style="padding:0 20px;">(Improve select control compatibility on certain browsers)</span></div>',
            createVSpace(30),
            '<div class="center-row">', createCheckbox('custom-date-picker', 'Use Custom Date Picker', useCustomDatePicker(), `${getGlobalName(useCustomDatePicker)}(this.checked)`),
            '<span style="padding:0 20px;">(Improve date-picker control compatibility on certain browsers)</span></div>'];

        let courseSelect = new Select('course-order', [
            ['SCY LCM SCM', 'SCY LCM SCM'],
            ['LCM SCY SCM', 'LCM SCY SCM'],
            ['SCY SCM LCM', 'SCY SCM LCM'],
            ['SCM SCY LCM', 'SCM SCY LCM'],
            ['LCM SCM SCY', 'LCM SCM SCY'],
            ['SCM LCM SCY', 'SCM LCM SCY']], courseOrder(), courseOrder);

        html.push(createVSpace(30),
            '<div class="center-row">Course Order: &nbsp;',
            courseSelect.render(useCustomSelect()),
            '<span style="padding:0 20px;">(Select the display course order)</span></div>');

        let colorSelect = new Select('theme-color', [
            ['Stroke Colors', 'light-mode,default-color'],
            ['Stroke Colors (Dark)', 'dark-mode,default-color'],
            ['Rustic Harmony', 'light-mode,harmony'],
            ['Celestial Palette', 'light-mode,celestial'],
            ['Ethereal Fade', 'light-mode,fade-color'],
            ['Light Mode', 'light-mode'],
            ['Dark Mode', 'dark-mode'],
        ], showColor(), showColor);

        html.push(createVSpace(30),
            '<div class="center-row">Color Themes: &nbsp;', colorSelect.render(useCustomSelect()),
            '<table style="margin:0 30px" class="example"><tr><td class="d50 FR">Free</td><td class="d50 BK">Back</td><td class="d50 BR">Breast</td>',
            '<td class="d50 FL">Fly</td><td class="d100 IM">IM</td></tr></table></div>',
            '</div>');

        return html.join('');
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // search functions

    async function search(name) {
        if (!name) {
            window.location.replace('');
            return;
        }

        document.title = _title + ' - Search - ' + name;
        let hash = 'search/' + encodeURIComponent(name);
        let all = false;
        if (name.endsWith('~19O')) {
            name = name.substring(0, name.length - 4);
            all = true;
        }

        let index = name.indexOf(',');
        if (index > 0) {
            name = name.substring(index + 1) + ' ' + name.substring(0, index);
        }

        await ensureToken();
        let data = await loadSearch(name, all);

        showSearch(data, hash);
    }
    _navFuncMap.set('search', search);

    async function loadSearch(name, all) {
        name = name.trim().replace(/\s+/g, ' ');
        let key = 'search/' + name + (all ? '<ALL>' : '');
        let data = await LocalCache.func(key, async () => {
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

        return await convertObject(data);
    }

    async function filterSwimmers(values) {
        let idxPkey = values.idx.pkey;

        let pkeys = new Set(values.map(v => v[idxPkey]));

        let bodyObj = {
            metadata: [
                {
                    title: 'pkey',
                    dim: '[UsasSwimTime.PersonKey]',
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

        let result = values.filter(row => pkeys.has(row[idxPkey]));
        result.idx = values.idx;
        result.cacheTime = min(values.cacheTime, list.cacheTime);

        return result;
    }

    function showSearch(values, loadingHash) {
        if (values.length == 0) {
            updateContent('No result found', loadingHash);
            return;
        }

        if (values.length == 1) {
            // replace will remove the current entry from the browser history
            window.location.replace('#swimmer/' + encodeURIComponent(values[0].pkey));
            return;
        }

        let html = ['<table class="fill top-margin" id="search-table"><tbody><tr class="th"><th></th>'];
        for (let [key, title] of [['name', 'Name'], ['age', 'Age'], ['clubName', 'Club'], ['lsc', 'LSC']]) {
            html.push(`<th class="clickable" onclick="${getGlobalName(sortSearch)}('${key}')">${title}</th>`);
        }
        html.push('</tr>');
        for (let [i, row] of values.entries()) {
            html.push(`<tr class="clickable" onclick="${getGlobalName(go)}('swimmer', ${row.pkey})"><td>`, i + 1, '</td><td class="left">',
                row.name, '</td><td>', row.age, '</td><td class="left">', row.clubName, '</td><td>', row.lsc, '</td></tr>');
        }
        html.push('</tbody></table>');

        updateContent(html.join(''), loadingHash);

        let table = document.getElementById('search-table');
        table.values = values;
        table.loadingHash = loadingHash;
    }

    function sortSearch(sortby) {
        let table = document.getElementById('search-table');
        let values = table.values;

        let sorted = values.stableSort((a, b) => a[sortby] == b[sortby] ? 0 : a[sortby] > b[sortby] ? 1 : -1);
        if (arrayEqual(sorted, values, (a, b) => a == b)) {
            sorted = values.stableSort((a, b) => a[sortby] == b[sortby] ? 0 : a[sortby] < b[sortby] ? 1 : -1);
        }
        showSearch(sorted, table.loadingHash);
    }

    async function loadClubSearch(value, all) {
        let bodyObj = {
            metadata: [
                {
                    title: 'name',
                    dim: '[Persons.FullName]'
                },
                {
                    title: 'age',
                    dim: '[Persons.Age]',
                    sort: 'asc'
                },
                {
                    title: 'clubName',
                    dim: '[Persons.ClubName]',
                    filter: {
                        contains: value
                    }
                },
                {
                    title: 'lsc',
                    dim: '[Persons.LscCode]'
                },
                {
                    title: 'pkey',
                    dim: '[Persons.PersonKey]'
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
            values.cacheTime = min(values.cacheTime || new Date(), vs.cacheTime)
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
                    title: 'name',
                    dim: '[Persons.FullName]'
                },
                {
                    title: 'age',
                    dim: '[Persons.Age]',
                    sort: 'asc'
                },
                {
                    title: 'clubName',
                    dim: '[Persons.ClubName]'
                },
                {
                    title: 'lsc',
                    dim: '[Persons.LscCode]'
                },
                {
                    title: 'pkey',
                    dim: '[Persons.PersonKey]'
                },
                {
                    dim: '[Persons.LastName]',
                    filter: {
                        startsWith: lastName
                    },
                    panel: 'scope'
                },
                {
                    dim: '[Persons.FirstAndPreferredName]',
                    filter: {
                        contains: firstName
                    },
                    panel: 'scope'
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

        await ensureToken();
        let data = await loadDetails(Number(pkey));
        //setPageData(data);

        // show the rank button, need some info for the rank href
        let swimmer = data.swimmer;
        let params = getRankDataKey(convetToGenderString(swimmer.gender), getAgeKey(swimmer.age),
            1, swimmer.zone, swimmer.lsc, swimmer.clubName);

        document.title = _title + ' - ' + swimmer.name;
        TopButton.show('relay', params);
        TopButton.show('rank', params);
        TopButton.pkey = Number(pkey);

        // let t0 = performance.now();
        await showDetails(data, 'swimmer/' + pkey);
        // let t1 = performance.now();
        // console.log('Swimmer details render time:', t1 - t0, 'ms');
    }
    _navFuncMap.set('swimmer', swimmer);

    async function loadDetails(pkey) {
        let data = await LocalCache.func('swimmer/' + pkey, async () => {
            let swimmerCall = loadSwimerInfo(pkey);
            let eventsCall = loadEvents(pkey);

            let [swimmerInfo, events] = await Promise.all([swimmerCall, eventsCall]);
            if (!swimmerInfo || !events) {
                throw new Error('Cannot get data for ' + pkey);
            }

            return {
                events: events,
                swimmer: swimmerInfo,
                cacheTime: events.cacheTime
            };
        }, null, 6);

        if (data) {
            return await postLoadDetails(data);
        }
    }

    async function postLoadDetails(data) {
        data.events = (await convertObject(data.events))
            .sort((a, b) => a.date != b.date ? (a.data < b.data ? -1 : 1) :
                a.meet != b.meet ? a.meet - b.meet : _sessionOrder[a.session] - _sessionOrder[b.session]);

        let swimmer = data.swimmer;
        swimmer.birthday = _birthdayDictionary.calculate(swimmer.pkey, data.events, swimmer.age);
        swimmer.alias = getAlias(swimmer.firstName, swimmer.lastName);
        swimmer.gender = data.events[0]?.gender || '';
        swimmer.name = swimmer.alias + ' ' + swimmer.lastName

        return data;
    }

    async function loadEvents(pkey) {
        let bodyObj = {
            metadata: [
                //[UsasSwimTime.FinishPosition]
                //[UsasSwimTime.FullName]
                //[Age.AgeGroup1]
                {
                    title: 'time',
                    dim: '[UsasSwimTime.SwimTimeFormatted]'
                },
                {
                    title: 'age',
                    dim: '[UsasSwimTime.AgeAtMeetKey]'
                },
                {
                    title: 'std',
                    dim: '[TimeStandard.TimeStandardName]'
                },
                {
                    title: 'lsc',
                    dim: '[OrgUnit.Level3Code]'
                },
                {
                    title: 'clubName',
                    dim: '[OrgUnit.Level4Name]'
                },
                {
                    title: 'date',
                    dim: '[SeasonCalendar.CalendarDate (Calendar)]',
                    level: 'days',
                    sort: 'asc'
                },
                {
                    title: 'event',
                    dim: '[UsasSwimTime.SwimEventKey]'  //[SwimEvent.EventCode]
                },
                {
                    title: 'meet',
                    dim: '[UsasSwimTime.MeetKey]'   //[Meet.MeetKey]
                },
                {
                    title: 'gender',
                    dim: '[UsasSwimTime.EventCompetitionCategoryKey]'   //[EventCompetitionCategory.TypeName]
                },
                {
                    title: 'session',
                    dim: '[Session.SessionKey]' //[Session.SessionName]
                },
                {
                    title: 'score',
                    dim: '[UsasSwimTime.PowerPoints]'
                },
                {
                    title: 'splash',
                    dim: '[UsasSwimTime.UsasSwimTimeKey]'
                },
                {
                    dim: '[UsasSwimTime.PersonKey]',
                    filter: {
                        equals: pkey
                    },
                    panel: 'scope'
                }
            ],
            count: 5000
        };

        let events = await fetchSwimValues(bodyObj, 'event');
        if (!events) {
            return;
        }

        shortenDateField(events);

        await appendSubArray(events, 'splash', loadSplits);

        return events;
    }

    async function loadSplits(key, map) {
        let bodyObj = {
            metadata: [
                {
                    title: 'dist',
                    dim: '[SwimTimeSplit.CumulativeDistance]',
                    sort: 'asc'
                },
                {
                    title: 'split',
                    dim: '[SwimTimeSplit.CumulativeSplitTimeFormatted]'
                },
                {
                    title: key,
                    dim: '[SwimTimeSplit.UsasSwimTimeKey]',
                    filter: {
                        members: [...map.keys()]
                    }
                }
            ],
            count: map.size * 30
        };

        return await fetchSwimValues(bodyObj, 'split');
    }

    async function loadSwimerInfo(pkey) {
        let bodyObj = {
            metadata: [
                {
                    title: 'firstName',
                    dim: '[Persons.FirstAndPreferredName]'
                },
                {
                    title: 'lastName',
                    dim: '[Persons.LastName]'
                },
                {
                    title: 'age',
                    dim: '[Persons.Age]'
                },
                {
                    title: 'clubName',
                    dim: '[Persons.ClubName]'
                },
                {
                    title: 'lsc',
                    dim: '[Persons.LscCode]'
                },
                {
                    title: 'pkey',
                    dim: '[Persons.PersonKey]',
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

    async function showDetails(data, loadingHash) {
        if (!data) {
            updateContent('No swimmer found', loadingHash);
            return;
        }

        let hide25 = data.swimmer.age > 8 && !show25();
        if (hide25) {
            let scy25free = 81; //_eventIndexMap.get('25 FR SCY');
            data.events = data.events.filter(e => e.event < scy25free);
        }

        let html = [];

        // build title
        html.push(await createDetailsPageTitle(data));
        if (data.events.length == 0) {
            html.push('<div>No events found</div>');
            updateContent(html.join(''), loadingHash);
            return;
        }

        // create deep map for course -> stroke -> distance -> [ events ]
        let [courseMap, ageList] = createTableData(data);

        let tabView = new TabView('swimmerTabView');
        tabView.addTab('<p>Personal Best</p>', await createBestTimeTablePage(data.swimmer, courseMap));
        tabView.addTab('<p>Age Best</p>', createAgeBestTimeTable(courseMap, ageList));
        tabView.addTab('<p>Meets</p>', createMeetTable(data, courseMap));
        tabView.addTab(createClickableDiv('Progress Graph', `${getGlobalName(showGraph)}()`), createProgressGraph(data.swimmer.pkey, hide25));
        html.push(tabView.render());

        updateContent(html.join(''), loadingHash);

        initGraphConfig(data);
    }

    function createTableData(data) {
        let ageSet = new Set();
        let courseMap = new Map();

        for (let row of data.events) {
            let age = row.age;
            let [dist, stroke, course] = row.eventStr.split(' ');
            dist = Number(dist);

            // build ageSet
            ageSet.add(age);

            // build courseMap
            let strokeMap = courseMap.get(course) || courseMap.set(course, new Map()).get(course);
            let distMap = strokeMap.get(stroke) || strokeMap.set(stroke, new Map()).get(stroke);
            let eventList = distMap.get(dist) || distMap.set(dist, []).get(dist);
            eventList.push(row);

            // buld best of each event
            if (!eventList.best || row.timeInt < eventList.best.timeInt) {
                eventList.best = row;
            }

            // build age best for each event
            let ageBestMap = eventList.ageBestMap = eventList.ageBestMap || new Map();
            let ageBest = ageBestMap.get(age);
            if (!ageBest || row.timeInt < ageBest.timeInt) {
                ageBestMap.set(age, row);
            }
        }

        // sort the map by course, storkes and distances
        courseMap = courseMap.sort((a, b) => _courseIndexMap.get(a[0]) - _courseIndexMap.get(b[0]));
        for (let [course, strokeMap] of courseMap) {
            strokeMap = strokeMap.sort((a, b) => _strokeIndexMap.get(a[0]) - _strokeIndexMap.get(b[0]));
            courseMap.set(course, strokeMap);

            strokeMap.rowCount = 0;

            for (let [stroke, distMap] of strokeMap) {
                distMap = distMap.sort((a, b) => a[0] - b[0]);
                strokeMap.set(stroke, distMap);

                strokeMap.rowCount += distMap.size;
            }
        }

        let ageList = [...ageSet].sort((a, b) => a - b);

        return [courseMap, ageList];
    }

    function initGraphConfig(data) {
        let canvas = document.getElementById('canvas');
        let event = data.events[data.events.length - 1].event;
        event = event > 80 ? event : event > 54 ? event - 54 : event > 27 ? event - 27 : event;
        canvas.config = {
            swimmer: data,
            swimmerList: [data],
            mouseX: 0,
            mouseY: 0,
            ageAlign: false,
            SCY: true,
            SCM: true,
            LCM: true,
            xZoomFactor: parseFloat(localStorage.getItem('xZoomFactor')) || 1,
            yZoomFactor: parseFloat(localStorage.getItem('yZoomFactor')) || 1,
            event: event
        };
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

    async function findUsaSwimmer(firstName, lastName, birthdayPair, token, thread) {
        async function fetchCall(birthday) {
            const url = `https://personapi.usaswimming.org/swims/Person/omr/query/dupcheck?firstName=${firstName}&lastName=${lastName}&birthDate=${birthday}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            if (response.ok) {
                return response.json();
            }
        }

        let end = new Date(birthdayPair[1] + 'T00:00:00.000Z');
        let dates = [];
        for (let day = new Date(birthdayPair[0] + 'T00:00:00.000Z'); day.getTime() <= end.getTime(); day.setUTCDate(day.getUTCDate() + 1)) {
            dates.push(day.toJSON().substring(0, 10));
            if (dates.length == thread || day.getTime() == end.getTime()) {
                let promises = dates.map(day => fetchCall(day));
                let results = await Promise.all(promises);
                for (let result of results) {
                    if (result?.length > 0) {
                        return result;
                    }
                }
                dates = [];
            }
        }
    }

    async function createDetailsPageTitle(data) {
        let html = [];

        console.log(data.swimmer);

        let swimmer = data.swimmer;
        let range = BirthdayDictionary.format(swimmer.birthday);

        html.push('<div class="center-row header p-space">',
            Favorite.createButton(swimmer.pkey, swimmer.name, swimmer.age, swimmer.clubName, swimmer.lsc), '<p>', swimmer.name, '</p><p>',
            convetToGenderString(swimmer.gender), '</p><p>', swimmer.age, '</p><p>', swimmer.clubName, '</p><p>Birthday: ');
        let thread = parseInt(localStorage.getItem('xbday'));
        if (thread > 0) {
            let load = new Loading('xbday', range, async id => {
                let xbday = await LocalCache.get('xbday/' + swimmer.pkey, _10YearsInSec);
                if (!xbday) {
                    let result = await findUsaSwimmer(swimmer.alias, swimmer.lastName, swimmer.birthday, token, thread);
                    xbday = result?.[0]?.birthDate.substring(0, 10);
                    xbday && LocalCache.set('xbday/' + swimmer.pkey, xbday);
                }
                load.done(xbday);
            });
            html.push(load.render());
        } else {
            html.push(range);
        }

        html.push('</p><p>Total Event: ', data.events.length, '</p></div>');

        // update favorite swimmer info in the background
        _backgroundActions.push([params => {
            let [pkey, name, age, clubName, lsc] = params;
            if (Favorite.has(pkey)) {
                Favorite.set(pkey, name, age, clubName, lsc);
            }
        }, [swimmer.pkey, swimmer.name, swimmer.age, swimmer.clubName, swimmer.lsc]]);

        return html.join('');
    }

    async function createBestTimeTablePage(swimmer, courseMap) {
        let customSelect = useCustomSelect();

        function createShowCheckbox(name, label, cls, defaultValue) {
            let hideText = `.${cls}{display:none}`;
            let show = getLocalBoolValue(name, defaultValue);
            let html = [`<style id="${name}-style">${show ? '' : hideText}</style>`,
            createCheckbox(name, label, show, `${getGlobalName(setLocalBoolValue)}('${name}',this.checked);document.getElementById('${name}-style').innerText=this.checked?'':'${hideText}'`)];
            return html.join('');
        }

        let html = ['<div class="content"><h2>Personal Best</h2><div class="center-row">',
            createShowCheckbox('show-rk', 'show rankings', 'rk', false), createHSpace(20)
        ];

        if (swimmer.age > 9) {
            html.push(createShowCheckbox('show-smt', 'single age times', 'smt', false), createHSpace(20))
        }

        html.push(createShowCheckbox('show-mt', 'motivation times', 'mt', false), createHSpace(20));

        html.push(createShowCheckbox('show-mc', 'meet cuts', 'mc', true));

        let ageOpts = [];
        for (let i = 8; i <= 19; ++i) {
            ageOpts.push([`　${i == 8 ? '8U' : i == 19 ? '19O' : i}　`, i]);
        }
        let ageValue = swimmer.age < 9 ? 8 : swimmer.age > 18 ? 19 : swimmer.age;
        let ageSelect = new Select('age-select', ageOpts, ageValue, async value => {
            let tableElem = document.getElementById('best-time-table');
            let override = tableElem.override = tableElem.override || {};
            override.age = parseInt(value);
            tableElem.innerHTML = await createBestTimeTable(swimmer, courseMap, override);
        });
        ageSelect.class = 'mc';
        html.push(createHSpace(20), '<span class="mc">cuts age:&nbsp;</span>', ageSelect.render(customSelect));

        let lscOpts = [];
        for (let [lsc, details] of lscMap) {
            lscOpts.push([`${lsc} - ${details[0]}`, `${lsc},${details[1]}`]);
        }
        let lscSelect = new Select('lsc-select', lscOpts, `${swimmer.lsc},${swimmer.zone}`, async value => {
            let [lsc, zone] = value.split(',');
            let tableElem = document.getElementById('best-time-table');
            let override = tableElem.override = tableElem.override || {};
            override.lsc = lsc;
            override.zone = zone;
            document.getElementById('best-time-table').innerHTML = await createBestTimeTable(swimmer, courseMap, override);
        });
        lscSelect.class = 'mc';
        html.push(createHSpace(20), '<span class="mc">cuts LSC:&nbsp;</span>', lscSelect.render(customSelect));

        html.push('</div><div id="best-time-table">',
            await createBestTimeTable(swimmer, courseMap),
            '</div></div>');

        return html.join('');
    }

    async function createBestTimeTable(swimmer, courseMap, override) {
        let rankAgeKey = getAgeKey(swimmer.age);
        let age = override?.age || swimmer.age;
        let zone = override?.zone || swimmer.zone;
        let lsc = override?.lsc || swimmer.lsc;
        let genderStr = convetToGenderString(swimmer.gender);
        let meetList = await buildMeetList(genderStr, age, zone, lsc);
        let standardNames = [...(await getAgeGroupMotivationMap()).keys()];

        let html = ['<table class="fill top-margin color-table hilightrow"><tbody>'];

        // create the table header
        let header = createBestTimeTableHeader(swimmer, standardNames, meetList, age);

        for (let [course, strokeMap] of courseMap) {
            html.push(header);

            let leading = `<td class="age" rowspan="${strokeMap.rowCount}">${course}</td>`;

            for (let [stroke, distMap] of strokeMap) {
                leading += `<td class="age" rowspan="${distMap.size}">${_storkeMap.get(stroke)}</td>`;

                for (let [dist, eventList] of distMap) {
                    let row = eventList.best;
                    let event = row.event;
                    let timeInt = row.timeInt;
                    let eventStr = row.eventStr;
                    let cls = `d${dist} ${stroke}`;
                    let count = eventList.length;
                    let std = formatStandard(row.std);
                    let short = formatStandard(std, true);

                    html.push('<tr>', leading,
                        `<td class="full ${cls}">`, createClickableDiv(dist, `${getGlobalName(showGraph)}(null,{event:${event}})`),
                        `</td><td class="tc ${cls}">`, buildTimeCell(row.time, createPopup(short, std), row.score), `</td><td class="${cls}">`, formatDate(row.date), `</td><td class="${cls}">`, count, '</td>',
                        await buildRankingCell(swimmer.pkey, timeInt, genderStr, event, rankAgeKey, cls, swimmer.zone, swimmer.lsc, swimmer.clubName),
                        await buildRankingCell(swimmer.pkey, timeInt, genderStr, event, rankAgeKey, cls, swimmer.zone, swimmer.lsc),
                        await buildRankingCell(swimmer.pkey, timeInt, genderStr, event, rankAgeKey, cls, swimmer.zone),
                        await buildRankingCell(swimmer.pkey, timeInt, genderStr, event, rankAgeKey, cls));

                    let stds = [];

                    let singleTimeCount = 0;
                    if (age < 19) {
                        if (age > 9) {
                            for (let std of standardNames) {
                                stds.push(await getAgeGroupMotivationTime(std, age, genderStr, eventStr, true));
                            }
                        }
                        singleTimeCount = stds.length;

                        for (let std of standardNames) {
                            stds.push(await getAgeGroupMotivationTime(std, age, genderStr, eventStr));
                        }
                    }
                    let motivationTimeCount = stds.length;

                    for (let meetName of meetList) {
                        stds.push(meetName[2][event] || ['', 0]);
                    }

                    // build standard cell
                    let preTime;
                    for (let [i, [stdStr, stdInt]] of stds.entries()) {
                        let css = i < singleTimeCount ? 'smt' : i < motivationTimeCount ? 'mt' : 'mc';
                        if (!stdInt) {
                            html.push(`<td class="${css} ${cls}"></td>`);
                            continue;
                        }
                        preTime = (preTime && preTime >= stdInt ? preTime : 0) || stdInt * 1.15;
                        let percent = Math.min(100, Math.max(0, (timeInt - stdInt) / (preTime - stdInt) * 100));
                        percent = 100 - (percent < 5 && percent > 0 ? 5 : percent);
                        let updowncls = timeInt <= stdInt ? 'dp' : 'ad';
                        html.push(`<td class="${css} ${cls} tc">`, buildTimeCell(stdStr, '', formatDelta(timeInt - stdInt), updowncls, percent), '</td>');
                        preTime = stdInt;
                    }

                    html.push('</tr>');
                    leading = '';
                }
            }
        }

        html.push('</tbody></table>');

        return html.join('');
    }

    async function buildMeetList(genderStr, age, zone, lsc) {
        let meetList = [];
        for (let [name, meet] of await getLscMeetCuts(zone, lsc)) {
            if (meet.ageMap.has(age)) {
                meetList.push([name, meet.details, []]);
            }
        }

        for (let meetInfo of meetList) {
            let mapArray = meetInfo[2];
            for (let eventStr of _eventList) {
                // skip relay events
                mapArray.push(eventStr.includes('-R') ? null :
                    await getMeetCut(zone, lsc, meetInfo[0], age, genderStr, eventStr));
            }
        }

        meetList.sort((a, b) => {
            let count = 0;
            let acuts = a[2];
            let bcuts = b[2];
            for (let i = 0; i < acuts.length; (i == 27 ? i = 55 : ++i)) {   // skip 28-54 for SCM
                let acut = acuts[i];
                let bcut = bcuts[i];
                if (acut && bcut && acut[1] != bcut[1]) {
                    count += (acut[1] < bcut[1] ? 1 : -1);
                }
            }
            return count;
        });

        return meetList;
    }

    function createBestTimeTableHeader(swimmer, standardNames, meetList, age) {
        let ageKey = getAgeKey(age);

        let html = ['<tr><th rowspan="2">Course</th><th rowspan="2">Stroke</th><th rowspan="2">Distance</th>',
            '<th rowspan="2">Best<br>Time</th><th rowspan="2">Event<br>Date</th><th rowspan="2" class="full">',
            createPopup('Event<br>Count', 'Total Event Count', 'top:-5px'), '</th><th class="rk" colspan="4">Rankings</th>'];

        if (age < 19) {
            if (age > 9) {
                html.push(`<th colspan="${standardNames.length}" class="smt full">`,
                    createPopup(`Single Age Motivational Standards (${age})`, 'USA Swimming 2024-2028 Single Age Motivational Standards'),
                    '</th>');
            }
            html.push(`<th colspan="${standardNames.length}" class="mt full">`,
                createPopup(`Age Group Motivational Standards (${ageKey == '8U' ? '10U' : ageKey})`, 'USA Swimming 2024-2028 Age Group Motivational Standards'),
                '</th>');
        }

        if (meetList.length > 0) {
            html.push(`<th colspan="${meetList.length}" class="mc">Meet Standards</th>`);
        }

        html.push('</tr><tr><th class="rk full">', createPopup(swimmer.club, swimmer.clubName, 'top:-15px'), '</th><th class="rk full">',
            createPopup(swimmer.lsc, getLSCName(swimmer.lsc), 'top:-15px'), '</th><th class="rk full">',
            createPopup(swimmer.zone[0] + 'Z', swimmer.zone + ' Zone', 'top:-15px'), '</th><th class="rk full">', createPopup('US', 'USA Swimming'), '</th>');

        if (age < 19) {
            if (age > 9) {
                for (let std of standardNames) {
                    html.push('<th class="smt">', std, '</th>');
                }
            }

            for (let std of standardNames) {
                html.push('<th class="mt">', std, '</th>');
            }
        }

        for (let meetInfo of meetList) {
            let lines = meetInfo[1].split('<br>').length;
            html.push('<th class="mc full">', createMeetNamePop(meetInfo[0], meetInfo[1], `top:-${lines * 19}px`), '</th>');
        }

        html.push('</tr>');
        return html.join('');
    }

    function createMeetNamePop(name, details, style, changeNameNewlineTo) {
        name = name.replace(/_/g, ' ').replace(/<br>/g, changeNameNewlineTo || '<br>');
        details = details.replace(/\[(.+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        return createPopup(name, details, style);
    }

    function createAgeBestTimeTable(courseMap, ageList) {
        let html = ['<div class="content"><h2>Age Best Time</h2><table class="fill color-table agebest hilightrow"><tbody>'];

        let header = '<tr><th>Course</th><th>Stroke</th><th>Distance</th>' + ageList.map(age => `<th>${age}</th>`).reverse().join('') + '</tr>';

        for (let [course, strokeMap] of courseMap) {
            html.push(header);
            let leading = `<td class="age" rowspan="${strokeMap.rowCount}">${course}</td>`;

            for (let [stroke, distMap] of strokeMap) {
                leading += `<td class="age" rowspan="${distMap.size}">${_storkeMap.get(stroke)}</td>`;

                for (let [dist, eventList] of distMap) {
                    let cls = 'd' + dist + ' ' + stroke;
                    let event = eventList[0].event;
                    let ageBestMap = eventList.ageBestMap;

                    // build cells in reverse order, for quicker getting pre best time
                    let cells = [];
                    let preBest = null;
                    for (let age of ageList) {
                        let best = ageBestMap.get(age);
                        if (best) {
                            let std = formatStandard(best.std);
                            let short = formatStandard(std, true);
                            let date = formatDate(best.date);
                            let innerCls = !preBest ? '' : best.timeInt < preBest ? 'dp' : 'ad';
                            cells.push(`<td class="tc ${cls}">` + buildTimeCell(best.time, createPopup(short, std), date, innerCls) + '</td>');
                            preBest = Math.min(preBest || Infinity, best.timeInt);
                        } else {
                            cells.push(`<td class="${cls}"></td>`);
                        }
                    }
                    cells.reverse();

                    html.push('<tr>', leading, `<td class="full ${cls}">`,
                        createClickableDiv(dist, `${getGlobalName(showGraph)}(null,{event:${event}})`),
                        '</td>', ...cells, '</tr>');
                    leading = '';
                }
            }
        }

        html.push('</tbody></table></div>');

        return html.join('');
    }

    function createMeetTable(data, courseMap) {
        let meetsMap = createMeetTableData(data, courseMap);

        let html = ['<div class="content"><h2>Meets</h2>'];

        for (let [course, ageMap] of meetsMap) {

            html.push('<div class="header">', course, ' Event Count: ', ageMap.eventCount,
                '</div><table class="fill color-table hilightrow"><tbody>');

            // create the table header (2 rows)
            html.push('<tr><th rowspan="2"></th><th rowspan="2">Age</th><th rowspan="2">Date</th>');
            for (let [stroke, distList] of ageMap.strokeMap) {
                html.push(`<th colspan="${distList.length}">${_storkeMap.get(stroke)}</th>`);
            }
            html.push('<th rowspan="2">Meet</th><th rowspan="2">Team</th></tr><tr class="th">');
            for (let [stroke, distList] of ageMap.strokeMap) {
                for (let dist of distList) {
                    let evt = _eventIndexMap.get(`${dist} ${stroke} ${course}`);
                    let action = `${getGlobalName(showGraph)}(null,{event:${evt}})`;
                    html.push(`<td class="full d${dist} ${stroke}">`, createClickableDiv(dist, action), '</td>');
                }
            }
            html.push('</tr>');

            let leading = `<td class="age" rowspan="${ageMap.rowCount}">${course}</td>`;
            for (let [age, meetMap] of ageMap) {
                leading += `<td class="age" rowspan="${meetMap.size}">${age}</td>`;
                for (let [meet, eventMap] of meetMap) {
                    let oneEvent = eventMap.oneEvent;
                    let meetInfo = oneEvent.meetInfo;
                    html.push('<tr>', leading, `<td>${formatDate(meetInfo.date)}</td>`);

                    for (let [stroke, distList] of ageMap.strokeMap) {
                        for (let dist of distList) {

                            html.push(`<td class="d${dist} ${stroke} tc">`);

                            let event = _eventIndexMap.get(`${dist} ${stroke} ${course}`);
                            let splashList = eventMap.get(event);
                            if (splashList) {
                                let row = splashList.reduce((acc, row) => row.timeInt < acc.timeInt ? row : splashList[0]);

                                let delta = row.delta;
                                let style = delta > 0 ? 'ad' : delta < 0 ? 'dp' : '';
                                let time = row.time;
                                let std = formatStandard(row.std);
                                let short = formatStandard(std, true);

                                if (splashList.length > 1 || splashList[0].splash.length > 1) {
                                    let pop = [];
                                    let up = 18;
                                    pop.push('<table class="fill split">');
                                    for (let r of splashList) {
                                        let session = r.time.endsWith('r') ? 'Relay' : _sessionNames[r.session];
                                        pop.push('<tr><th>', session, '</th><th colSpan="99">', r.time, '</th></tr>');
                                        up += 22.4;
                                        if (r.splash.length > 0) {
                                            pop.push('<tr><th rowSpan="2">Split</th>');
                                            pop.push('<td>', r.splash.map(s => s.dist).join('</td><td>'), '</td>');
                                            pop.push('</tr><tr>');
                                            pop.push('<td>', r.splash.map(s => s.split).join('</td><td>'), '</td>');
                                            pop.push('</tr>');
                                            up += 44.8;
                                        }
                                    }
                                    pop.push('</table>')
                                    let popStyle = `top:-${up.toFixed()}px;left:-38px`;

                                    time = createPopup(time, pop.join(''), popStyle, ` data-pop="${splashList.length > 1 ? splashList.length : '*'}"`);
                                }

                                html.push(buildTimeCell(time, createPopup(short, std), formatDelta(delta), style));
                            }
                            html.push('</td>');
                        }
                    }

                    html.push(`<td class="left" data-meet="${oneEvent.meet}">${meetInfo.name}</td><td class="left">${oneEvent.clubName}</td></tr>`);
                    leading = '';
                }
            }

            html.push('</tbody></table>');
        }

        html.push('</div>');

        return html.join('');
    }

    function createMeetTableData(data, courseMap) {
        let meetsMap = new Map();
        for (let row of data.events) {
            let age = row.age;
            let meet = row.meet;
            let event = row.event;
            let [dist, stroke, course] = row.eventStr.split(' ');
            dist = Number(dist);

            // build meets map for table rows
            let ageMap = meetsMap.get(course) || meetsMap.set(course, new Map()).get(course);
            let meetMap = ageMap.get(age) || ageMap.set(age, new Map()).get(age);
            let eventMap = meetMap.get(meet) || meetMap.set(meet, new Map()).get(meet);
            eventMap.oneEvent = row;
            let splashList = eventMap.get(event) || eventMap.set(event, []).get(event);
            splashList.push(row);

            // build course total event count
            ageMap.eventCount = (ageMap.eventCount || 0) + 1;

            // build column info
            let strokeMap = ageMap.strokeMap = ageMap.strokeMap || new Map();
            let distSet = strokeMap.get(stroke) || strokeMap.set(stroke, new Set()).get(stroke);
            distSet.add(dist);
        }

        // sort the map by course, age and meet date
        meetsMap = meetsMap.sort((a, b) => _courseIndexMap.get(a[0]) - _courseIndexMap.get(b[0]));
        for (let [course, ageMap] of meetsMap) {

            // sort the age map to older first
            ageMap = ageMap.reverse();
            meetsMap.set(course, ageMap);

            let rowCount = 0;

            for (let [age, meetMap] of ageMap) {
                // sort the meet map to newer first
                meetMap = meetMap.reverse();
                ageMap.set(age, meetMap);

                rowCount += meetMap.size;
            }

            ageMap.rowCount = rowCount;

            ageMap.strokeMap = ageMap.strokeMap.sort((a, b) => _strokeIndexMap.get(a[0]) - _strokeIndexMap.get(b[0]));
            for (let [stroke, distSet] of ageMap.strokeMap) {
                ageMap.strokeMap.set(stroke, [...distSet].sort((a, b) => a - b));
            }
        }

        // calculate the event delta from previous best time for each event
        for (let [course, strokeMap] of courseMap) {
            for (let [stroke, distMap] of strokeMap) {
                for (let [dist, eventList] of distMap) {

                    let meetMap = eventList.meetMap = new Map();
                    for (let row of eventList) {
                        let meet = row.meet;
                        let splashList = meetMap.get(meet) || [];
                        meetMap.set(meet, splashList);
                        splashList.push(row);
                    }

                    let preBest = null;
                    for (let [meet, splashList] of meetMap) {
                        let meetBest = splashList[0];
                        for (let row of splashList) {
                            if (preBest) {
                                row.delta = row.timeInt - preBest;
                            }
                            if (row.timeInt < meetBest.timeInt) {
                                meetBest = row;
                            }
                        }
                        preBest = Math.min(preBest || Infinity, meetBest.timeInt);
                    }
                }
            }
        }
        return meetsMap;
    }

    function buildTimeCell(time, std, delta, color, percent) {
        if (!time) {
            return '<div>&nbsp;</div><div class="st">&nbsp;</div>';
        }

        let html = [`<div class="tt ${color || ''}">${time}</div>`];
        if (std) {
            html.push(`<div class="st">${std}</div><div class="dd ${color || ''}">${delta}</div>`);
        } else {
            html.push(`<div class="ds ${color || ''}">${delta === '' ? '&nbsp;' : delta}</div>`);
        }
        if (percent < 100) {
            html.push(`<div class="r" style="left:${percent.toFixed()}%"></div>`);
        }
        return html.join('');
    }

    function createProgressGraph(pkey, hide25) {
        let html = ['<div class="content">',
            showEventButtons(1, hide25, false, (event) => `${getGlobalName(showGraph)}(null,{pkey:${pkey},event:${event}})`),
            '<h2 id="graph-title" class="top-margin"></h2>'];

        let searchDropdown = new Dropdown('add-search',
            '<div class="center-row" onclick="event.stopPropagation()">' +
            `<input type="text" id="add-input" onkeypress="event.key=='Enter'&&${getGlobalName(addSearch)}(this.value)">` +
            `<button onclick="${getGlobalName(addSearch)}()">Search</button><button onclick="${getGlobalName(addSearch)}(null, true)">19&Over</button></div>`,
            '<div id="adding-list" onclick="event.stopPropagation()"></div>');

        html.push('<div class="add-search"><div>Compare progress with other swimmers:</div>', searchDropdown.render(), '</div>');

        html.push('</div>');

        html.push('<div class="top-margin">');
        for (let c of _courseOrder) {
            html.push(createCheckbox('show-' + c.toLocaleLowerCase(), c, true, `${getGlobalName(showGraph)}(null,{${c}:this.checked})`), createHSpace(10));
        }
        html.push('<span style="display:inline-block"><span id="swimmer-list" class="center-row"></span></span></div>');

        html.push(`<canvas id="canvas" class="hide" onmousemove="${getGlobalName(onCanvasMouseMove)}(this, event)" onwheel="${getGlobalName(wheelGraph)}(this, event)"></canvas>`);

        html.push('<div style="position:relative;margin:0 50px"class="resize-panel">',
            `<button class="resize clickable hide" style="left:40px;top:-190px" onclick="${getGlobalName(resizeY)}(-1)">⇧</button>`,
            `<button class="resize clickable hide" style="left:15px;top:-140px;transform:rotate(-90deg)" onclick="${getGlobalName(resizeX)}(-1)">⇧</button>`,
            `<button class="resize clickable hide" style="left:65px;top:-140px;transform:rotate(90deg)" onclick="${getGlobalName(resizeX)}(1)">⇧</button>`,
            `<button class="resize clickable hide" style="left:40px;top:-90px;transform:rotate(180deg)" onclick="${getGlobalName(resizeY)}(1)">⇧</button></div>`);

        let dateRange = new DoubleRange('date-range', 0, 1000, 0, 1000, 5, rangeChange);
        html.push('<div>', dateRange.render(), '</div>');

        html.push('<div class="top-margin">',
            createCheckbox('show-resize', 'show graph resize controls', false, `for(let e of document.getElementsByClassName('resize'))e.classList.toggle('hide')`),
            '</div>');

        html.push('<div class="tip"><span style="width:70px;display:inline-block;text-align:right;margin:0 8px">Mouse:</span>Ctrl⌘ + wheel to resize the date axis.  Shift + wheel to resize the time axis.<br>',
            '<span style="width:70px;display:inline-block;text-align:right;margin:0 8px">TouchPad:</span>Shift + two-finger up/down or left/right scroll to resize the date & time axis.</div>');

        return html.join('');
    }

    function rangeChange(obj, left, right) {
        showGraph(null, { slideLeft: left, slideRight: right });
    }

    document.body.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            let canvas = document.getElementById('canvas');
            if (canvas && !canvas.classList.contains('width')) {
                canvas.classList.add('width');
            }
        }

        if (e.shiftKey) {
            let canvas = document.getElementById('canvas');
            if (canvas && !canvas.classList.contains('height')) {
                canvas.classList.add('height');
            }
        }
    });

    document.body.addEventListener('keyup', (e) => {
        if (!(e.ctrlKey || e.metaKey)) {
            let canvas = document.getElementById('canvas');
            if (canvas && canvas.classList.contains('width')) {
                canvas.classList.remove('width');
            }
        }

        if (!e.shiftKey) {
            let canvas = document.getElementById('canvas');
            if (canvas && canvas.classList.contains('height')) {
                canvas.classList.remove('height');
            }
        }
    });

    // function isTouchDevice() {
    //     return (('ontouchstart' in window) ||
    //         (navigator.maxTouchPoints > 0) ||
    //         (navigator.msMaxTouchPoints > 0));
    // }

    async function onCanvasMouseMove(canvas, e) {
        e.preventDefault();
        e.stopPropagation();

        let offset = canvas.getBoundingClientRect();
        await showGraph(canvas, { mouseX: e.clientX - offset.left, mouseY: e.clientY - offset.top });
    }

    function updateGraphTitle(config) {
        let [dist, stroke, course] = _eventList[config.event].split(' ');

        const map = { 500: "400/500", 1000: "800/1000", 1650: "1500/1650" };
        document.getElementById('graph-title').innerText = `${map[dist] || dist} ${_storkeMap.get(stroke)}`;

        let selected = document.querySelector('button.evt.selected');
        if (selected) {
            selected.classList.remove('selected');
        }
        document.querySelector('button.evt.d' + dist + '.' + stroke).classList.add('selected');

        // update rank button
        let swimmer = config.swimmerList[0].swimmer;
        let params = getRankDataKey(convetToGenderString(swimmer.gender), getAgeKey(swimmer.age),
            config.event, swimmer.zone, swimmer.lsc, swimmer.clubName);

        TopButton.show('rank', params);
        TopButton.show('relay', params);
    }

    async function wheelGraph(canvas, e) {
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

            if (e.deltaX == 0) {
                await resizeX(e.deltaY > 0 ? -1 : 1, canvas);
            } else {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    await resizeX(e.deltaX > 0 ? -1 : 1, canvas);
                } else {
                    resizeY(e.deltaY > 0 ? -1 : 1, canvas);
                }
            }
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

    function updateSlider(config) {
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

            for (let row of swimmer.events) {
                let d = new Date(new Date(row.date) - bdayOffset);
                earliest = min(earliest, d);
                latest = max(latest, d);
            }
        }

        config.slide = DoubleRange.get('date-range');
        let l = earliest.getTime();
        let r = latest.getTime();
        if (config.slideLeft == l) {
            delete config.slideLeft;
        }
        if (config.slideRight == r) {
            delete config.slideRight;
        }
        config.slide.setValues(l, r, config.slideLeft || l, config.slideRight || r, 30 * 24 * 60 * 60 * 1000);
        let [min_, max_, minGap, left, right] = config.slide.getValues();

        earliest = new Date(left);
        latest = new Date(right);

        latest.setUTCMonth(latest.getUTCMonth() + 2);
        earliest.setUTCMonth(earliest.getUTCMonth() - 1);
        earliest.setUTCDate(1);
        earliest.setUTCHours(0);
        if (config.ageAlign) {
            earliest.setUTCDate(baseBirthday.getUTCDate());
        }
        config.earliest = earliest;
        config.latest = latest;
        config.duration = latest - earliest;
    }

    //                  l-blue,  brown,  l-green p-blue  l-red   siyan   l-purple pink   l-yellow orange
    const graphColors = ['#0AF', '#D85', '#0C4', '#88C', '#EBA', '#8CD', '#c9E', '#F9C', '#DD7', '#FC5'];

    function prepareGraphData(config) {
        let [dist, stroke, course] = _eventList[config.event].split(' ');

        let eventStrs = [];
        let values = [];
        let slowest = 0;
        let fastest = Infinity;

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
                let value = swimmer.events.filter(e => e.event == evt);
                value.name = swimmer.swimmer.name;
                value.birthday = bday;
                value.bdayOffset = bdayOffset;
                values.push(value);
                eventStrs.push(eventStr);

                for (let row of value) {
                    let d = new Date(new Date(row.date) - bdayOffset);
                    if (d < config.earliest || d > config.latest) {
                        continue;
                    }
                    let t = row.timeInt;
                    slowest = Math.max(slowest, t);
                    fastest = Math.min(fastest, t);
                    //earliest = min(earliest, new Date(row[idx.date]));
                }
            }
        }

        let delta = (slowest - fastest) * 0.1;
        slowest += Math.max(delta, 100);
        fastest = Math.floor((fastest - Math.max(delta, 50)) / 100) * 100;

        config.drawName = config.swimmerList.length > 1;
        config.eventStrs = eventStrs;
        config.values = values;
        config.slowest = slowest;
        config.fastest = fastest;

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
        ctx.strokeStyle = window.getComputedStyle(document.body).color;
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

    // async function drawMeetStandards(ctx, config) {
    //     let swimerList = config.swimmerList;
    //     if (swimerList.length > 1) {
    //         return;
    //     }
    //     let swimmer = swimerList[0].swimmer;
    //     let genderStr = convetToGenderString(swimmer.gender);
    //     let eventStr = _eventList[config.event]

    //     let lines = []
    //     let meetStds = await getMeetStandards(swimmer.age);
    //     for (let meet of meetStds) {
    //         let std = meet[genderStr].get(eventStr);
    //         if (!std || std[1] < config.fastest || std[1] > config.slowest) {
    //             continue;
    //         }
    //         lines.push([std[1], std[0], meet.meet]);
    //     }

    //     lines.sort((a, b) => a[1] - b[1]);
    //     let step = 20;
    //     let colors = ["#F66", "#6A6", "#66F", "#A6A", "#6AA", "#F99", "#9F9", "#99F", "#FF9", "#F9F", "#9FF"];
    //     for (let [i, line] of lines.entries()) {
    //         let y = config.height - (line[0] - config.fastest) / config.delta * config.height;
    //         ctx.beginPath();
    //         ctx.setLineDash([3, 7]);
    //         ctx.strokeStyle = ctx.fillStyle = colors[i % colors.length];
    //         ctx.moveTo(0, y);
    //         ctx.lineTo(config.width, y);
    //         ctx.stroke();
    //         ctx.fillText(line[1] + '  ' + line[2], config.width + 40, config.height - i * step);
    //         //console.log(std);
    //     }
    // }

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

    function squaredDistance(x1, y1, x2, y2) {
        return (x1 - x2) ** 2 + (y1 - y2) ** 2;
    }

    function drawClippedLine(ctx, width, height, x1, y1, x2, y2) {
        function clipLine(x1, y1, x2, y2, minX, minY, maxX, maxY) {
            let dx = x2 - x1;
            let dy = y2 - y1;

            let p = [-dx, dx, -dy, dy];
            let q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

            let u1 = 0, u2 = 1;

            for (let i = 0; i < 4; i++) {
                if (p[i] === 0 && q[i] < 0) {
                    return;
                }

                let t = q[i] / p[i];
                if (p[i] < 0) {
                    u1 = Math.max(u1, t);
                } else if (p[i] > 0) {
                    u2 = Math.min(u2, t);
                }
            }

            if (u1 > u2) {
                return;
            }

            return [
                x1 + u1 * dx, y1 + u1 * dy,
                x1 + u2 * dx, y1 + u2 * dy
            ];
        }

        let clipped = clipLine(x1, y1, x2, y2, 0, 0, width, height);
        if (clipped) {
            ctx.beginPath();
            ctx.moveTo(clipped[0], clipped[1]);
            ctx.lineTo(clipped[2], clipped[3]);
            ctx.stroke();
        }
    }

    // draw the cruve and dots, and find the tip row
    function drawCurve(ctx, config) {
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
            let bestTime = Infinity;
            let darkers = [];
            for (let row of value) {
                let timeInt = row.timeInt;
                let d = new Date(new Date(row.date) - value.bdayOffset);
                let x = (d - config.earliest) / config.duration * config.width;
                let y = config.height - (timeInt - config.fastest) / config.delta * config.height;

                if (pre) {
                    if (pre[0] >= 0 && x < config.width) {
                        // Check if both points are inside the range
                        ctx.beginPath();
                        ctx.moveTo(pre[0], pre[1]);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    } else if (x >= 0 && pre[0] < config.width) {
                        // Check if at least one point is inside the range
                        drawClippedLine(ctx, config.width, config.height, pre[0], pre[1], x, y);
                    }
                }
                pre = [x, y];

                if (x > 0 && x < config.width && y > 0 && y < config.height) {
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fill();

                    let touchPath = new Path2D();
                    touchPath.arc(x, y, 30, 0, 2 * Math.PI);
                    if (ctx.isPointInPath(touchPath, config.mouseX, config.mouseY)) {
                        let mX = config.mouseX - config.marginL;
                        let mY = config.mouseY - config.marginT
                        if (!tipRow || squaredDistance(x, y, mX, mY) < squaredDistance(tipRow[1], tipRow[2], mX, mY)) {
                            tipRow = [row, x, y, value.name];
                        }
                    }

                    if (timeInt > bestTime) {
                        darkers.push([x, y]);
                    }
                }
                bestTime = min(bestTime, timeInt);
            }

            ctx.fillStyle = "#0005";
            for (let [x, y] of darkers) {
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

        let [row, x, y, name] = tipRow;
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.stroke();

        let meetName = row.meetInfo.name;
        let dateAge = `${formatDate(row.date)}   ${row.eventStr.split(' ').pop()}   ${_sessionNames[row.session]}   Age:${row.age}`;
        let timeStd = row.time + '     ' + formatStandard(row.std) + (config.drawName ? '  (' + name + ')' : '');

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

        let eventStr = _eventList[config.event];
        let [dist, stroke, course] = eventStr.split(' ');
        eventStr = fixDistance(`${dist} ${stroke} SCY`);
        config.event = _eventIndexMap.get(eventStr);

        return config;
    }

    async function showGraph(canvas, config) {  //, pkey, event, mouseX, mouseY) {
        TabView.tab('swimmerTabView', 3);

        // pkey, event, mouseX, mouseY, ageAlign, SCY, SCM, LCM, swimerList, xZoomFactor, yZoomFactor
        // evnetStrs, values, slowest, fastest, earliest, latest, duration, width, height
        canvas = canvas || document.getElementById('canvas');
        config = canvas.config = mergeConfig(canvas.config, config);

        if (config.swimmerList.length == 0) {
            config.swimmerList.push(config.swimmer);
        }

        updateGraphTitle(config);

        updateSlider(config);

        prepareGraphData(config);

        let mouseX = config.mouseX - config.marginL;
        let mouseY = config.mouseY - config.marginT;
        if (mouseX > 0 && mouseY > 0 && mouseX < config.width && mouseY < config.height) {
            canvas.classList.add('cross');
        } else {
            canvas.classList.remove('cross');
        }

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

    async function addSearch(value, all) {
        document.getElementById('adding-list').innerHTML = '<div class=""><div class="loader"></div></div>';
        let dropdown = Dropdown.get('add-search');
        dropdown.open();

        value = value || document.getElementById('add-input').value;
        let html = [];
        if (value) {
            let list = await loadSearch(value, all);
            html.push('<table style="cursor:pointer;border-collapse:collapse;" class="left"><tbody>');
            for (let row of list) {
                html.push(`<tr onclick="${getGlobalName(addSwimmer)}(${row.pkey})" class="clickable"><td>${row.name}</td><td>${row.age}</td><td>${row.lsc}</td><td>${row.clubName}</td></tr>`);
            }
            html.push('</tbody></table>');
            html.push('<p class="tip">Click on the row to add the swimmer for comparison.</p>');
        } else {
            html.push(`<p class="tip">Enter the swimmer's name in the search box.</p>`);
        }

        document.getElementById('adding-list').innerHTML = html.join('');
    }

    async function addSwimmer(pkey) {
        document.getElementById('adding-list').innerHTML = '<div class="loading"><div class="loader"></div></div>';

        let canvas = document.getElementById('canvas');
        let swimmerList = canvas.config.swimmerList;

        if (!swimmerList.find(s => s.swimmer.pkey == pkey)) {
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
            html.push(createPopup(createCheckbox('age-align', 'Align by Age', config.ageAlign, `${getGlobalName(showGraph)}(null,{ageAlign:this.checked})`),
                `Compare swimmers' times at the same age.`));
        }

        for (let swimmer of config.swimmerList) {
            let id = 's_' + swimmer.swimmer.pkey;
            html.push(createHSpace(20), createCheckbox(id, swimmer.swimmer.name, !swimmer.hide, `${getGlobalName(checkSwimmer)}(this,${swimmer.swimmer.pkey})`),
                `<button class="xbutton" onclick="${getGlobalName(removeSwimmer)}(${swimmer.swimmer.pkey})">❌</button>`);
        }

        document.getElementById('swimmer-list').innerHTML = html.join('');
        await showGraph();
    }

    async function buildRankingCell(pkey, timeInt, genderStr, event, ageKey, cls, zone, lsc, club) {
        let html = [];

        let rankDataKey = getRankDataKey(genderStr, ageKey, event, zone, lsc, club);

        let values = await peekRank(rankDataKey);
        // sortkey, name, date, time, eventcode, club, lsccode, meet, eventkey, pkey, age
        // 0        1     2     3     4          5     6        7     8         9     10
        if (values) {
            let rank = calculateRank(values, pkey, timeInt);
            html.push(`<td class="full rk ${cls}">`, createClickableDiv(rank, `${getGlobalName(goRankWithPkey)}(\`${rankDataKey}\`,${pkey})`), '</td>');
        } else {
            let id = rankDataKey + '_' + pkey;
            html.push(`<td class="full rk ${cls}" id="${id}">`, createClickableDiv('<div class="loader"></div>', `${getGlobalName(go)}('rank',\`${rankDataKey}\`)`), '</td>');

            _backgroundActions.push([getRank, [rankDataKey, timeInt, pkey, id]]);
        }

        return html.join('');
    }

    let _scroolToPkey;
    let _highLightPkey;
    function goRankWithPkey(param, pkey) {
        _scroolToPkey = _highLightPkey = pkey;
        go('rank', param);
    }

    async function getRank(params) {
        let [mapKey, timeInt, pkey, id] = params;

        let data;
        let empty = '';
        try {
            data = await loadRank(mapKey);
        } catch (e) {
            empty = '⛓‍💥';
            console.warn(e, 'load rank failed', mapKey);
        }

        const element = document.getElementById(id);
        if (!element) {
            console.log('Cannot find element: ' + id);
            return;
        }

        let rank = data ? calculateRank(data, pkey, timeInt) : empty;

        element.innerHTML = createClickableDiv(rank, `${getGlobalName(go)}('rank', \`${mapKey}\`)`);
    }

    function calculateRank(values, pkey, timeInt) {
        let rank = '';
        let idx = values.idx || { pkey: 'pkey', time: 'time' };
        for (let [i, row] of values.entries()) {
            if (pkey == row[idx.pkey] || timeInt < timeToInt(row[idx.time])) {
                rank = i + 1;
                break;
            }
        }

        return rank;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // rank functions

    async function rank(key) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        document.title = _title + ' - Rank - ' + (decodeURIComponent(clubName) || lscMap.get(lsc)?.[0] || (zone ? zone + ' Zone' : 'USA'));

        TopButton.show('relay', key);
        TopButton.show('rank', false);

        let [load, show] = parseInt(event) > 90 ? [loadImxRank, showImxRank] : [loadRank, showRank];

        await ensureToken();
        let data;
        if (key.startsWith('Mixed')) {
            let promises = [load(key.replace('Mixed', 'Female')), load(key.replace('Mixed', 'Male'))];
            let results = await Promise.all(promises);
            if (results[0] && results[1]) {
                data = [];
                for (let [i, g] of [1, -1].entries()) {
                    for (let row of results[i]) {
                        row.timeInt = timeToInt(row.time);
                        row.gender = g;
                        data.push(row);
                    }
                }
                if (load == loadRank) {
                    data.sort((a, b) => a.timeInt - b.timeInt);
                } else {
                    data.sort((a, b) => b.score - a.score);
                }
            }
        } else {
            data = await load(key);
        }

        await show(data, key);
    }
    _navFuncMap.set('rank', rank);

    let rankDataRequiredVersion = 7;
    async function peekRank(key) {
        return await LocalCache.get('rank/' + key, null, rankDataRequiredVersion);
    }

    async function loadRank(key) {
        let values = await LocalCache.func('rank/' + key, async () => {
            let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

            let values;
            if (clubName) {
                let swimmerAgeMap = await loadClubSwimmerAgeMap(lsc, clubName, ageKey);
                values = await loadRankDataByClub(key, swimmerAgeMap);
            } else {
                values = await LoadRankDataAll(key);
                values = await filterByAndAppendAge(values, ageKey);
            }

            if (!values) {
                return;
            }

            values = truncateFetchData(values, 1000);

            shortenDateField(values);

            removeDataIdx(values, 'sortkey');

            return values;
        }, null, rankDataRequiredVersion);

        return await convertObject(values);
    }

    async function loadClubSwimmerAgeMap(lsc, clubName, ageKey) {
        let cacheKey = 'club/' + lsc + '_' + clubName + '_' + ageKey;

        let values = await LocalCache.func(cacheKey, async () => {
            let [from, to] = decodeAgeKey(ageKey);

            let bodyObj = {
                metadata: [
                    {
                        title: 'pkey',
                        dim: '[Persons.PersonKey]'
                    },
                    {
                        title: 'age',
                        dim: '[Persons.Age]',
                        filter: {
                            from: from,
                            to: to
                        }
                    },
                    {
                        dim: '[Persons.ClubName]',
                        filter: {
                            equals: clubName
                        },
                        panel: 'scope'
                    },
                    {
                        dim: '[Persons.LscCode]',
                        filter: {
                            equals: lsc
                        },
                        panel: 'scope'
                    }
                ],
                count: 1000
            };

            return await fetchSwimValues(bodyObj);
        });

        return new Map(values);
    }

    async function loadRankDataByClub(key, swimmerAgeMap) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

        let year = getSessionYear();

        let bodyObj = {
            metadata: [
                {
                    title: 'name',
                    dim: '[Person.FullName]'
                },
                {
                    title: 'date',
                    dim: '[SeasonCalendar.CalendarDate (Calendar)]',
                    level: 'days'
                },
                {
                    title: 'time',
                    dim: '[UsasSwimTime.SwimTimeFormatted]'
                },
                {
                    title: 'clubName',
                    dim: '[OrgUnit.Level4Name]'
                },
                {
                    title: 'lsc',
                    dim: '[OrgUnit.Level3Code]'
                },
                {
                    title: 'meet',
                    dim: '[UsasSwimTime.MeetKey]'
                },
                {
                    title: 'pkey',
                    dim: '[UsasSwimTime.PersonKey]',
                    filter: {
                        members: [...swimmerAgeMap.keys()]
                    }
                },
                {
                    title: 'score',
                    dim: '[UsasSwimTime.PowerPoints]'
                },
                {
                    title: 'sortkey',
                    dim: '[UsasSwimTime.SortKey]',
                    sort: 'asc'
                },
                {
                    title: 'event',
                    dim: '[UsasSwimTime.SwimEventKey]',
                    filter: {
                        equals: Number(event)
                    },
                    panel: 'scope'
                },
                {
                    dim: '[UsasSwimTime.EventCompetitionCategoryKey]',
                    filter: {
                        equals: convertToGenderCode(genderStr)
                    },
                    panel: 'scope'
                },
                {
                    dim: '[SeasonCalendar.SeasonYearDesc]',
                    filter: {
                        members: [
                            `${year} (9/1/${year - 1} - 8/31/${year})`,
                            `${year - 1} (9/1/${year - 2} - 8/31/${year - 1})`,
                            `${year - 2} (9/1/${year - 3} - 8/31/${year - 2})`
                        ]
                    },
                    panel: 'scope'
                }
            ],
            count: 5000
        }

        let list = await fetchSwimValues(bodyObj, 'event');
        if (!list || list.length == 0) {
            return list;
        }

        // Filter to get the first(fast) time of each swimmer & append the age to the end of each row of list
        let idx = list.idx;
        let values = [];
        idx.age = list[0].length;
        for (let row of list) {
            let pkey = row[idx.pkey];
            let age = swimmerAgeMap.get(pkey);
            if (age) {
                row.push(age);
                values.push(row);
                swimmerAgeMap.delete(pkey);
            }
        }

        values.idx = idx;
        values.cacheTime = list.cacheTime;
        return values;
    }

    function getRankDataKey(genderStr, ageKey, event, zone, lsc, clubName) {
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
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(mapKey);

        let year = getSessionYear();

        let [from, to] = decodeAgeKey(ageKey);
        from = from > 0 ? from - 2 : 0;

        let bodyObj = {
            metadata: [
                {
                    title: 'name',
                    dim: '[UsasSwimTime.FullName]'
                },
                {
                    title: 'date',
                    dim: '[SeasonCalendar.CalendarDate (Calendar)]',
                    level: 'days'
                },
                {
                    title: 'time',
                    dim: '[UsasSwimTime.SwimTimeFormatted]'
                },
                {
                    title: 'clubName',
                    dim: '[OrgUnit.Level4Name]'
                },
                {
                    title: 'lsc',
                    dim: '[OrgUnit.Level3Code]'
                },
                {
                    title: 'meet',
                    dim: '[UsasSwimTime.MeetKey]'
                },
                {
                    title: 'pkey',
                    dim: '[UsasSwimTime.PersonKey]'
                },
                {
                    title: 'score',
                    dim: '[UsasSwimTime.PowerPoints]'
                },
                {
                    title: 'sortkey',
                    dim: '[UsasSwimTime.SortKey]',
                    sort: 'asc'
                },
                {
                    title: 'event',
                    dim: '[UsasSwimTime.SwimEventKey]',
                    filter: {
                        equals: Number(event)
                    },
                    panel: 'scope'
                },
                {
                    dim: '[UsasSwimTime.AgeAtMeetKey]',
                    filter: {
                        from: from,
                        to: to
                    },
                    panel: 'scope'
                },
                {
                    dim: '[EventCompetitionCategory.EventCompetitionCategoryKey]',
                    filter: {
                        equals: convertToGenderCode(genderStr)
                    },
                    panel: 'scope'
                },
                {
                    dim: '[SeasonCalendar.SeasonYearDesc]',
                    filter: {
                        members: [
                            `${year} (9/1/${year - 1} - 8/31/${year})`,
                            `${year - 1} (9/1/${year - 2} - 8/31/${year - 1})`,
                            // `${year - 2} (9/1/${year - 3} - 8/31/${year - 2})`
                        ]
                    },
                    panel: 'scope'
                }
            ],
            count: 5000
        }

        if (zone) {
            bodyObj.metadata.push({
                dim: '[OrgUnit.Level2Code]',
                filter: {
                    equals: zone
                },
                panel: 'scope'
            });
        }

        if (lsc) {
            bodyObj.metadata.push({
                dim: '[OrgUnit.Level3Code]',
                filter: {
                    equals: lsc
                },
                panel: 'scope'
            });
        }

        return await fetchSwimValues(bodyObj, 'event');
    }

    async function loadImxRank(key) {
        let values = await LocalCache.func('rankImx/' + key, async () => {
            let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

            let [imxType, _, course] = _eventList[event].split(' ');
            let [from, to] = decodeAgeKey(ageKey);
            let eventCount = from >= 13 && imxType == 'IMX' ? 6 : 5;

            let values;
            if (clubName) {
                let swimmerAgeMap = await loadClubSwimmerAgeMap(lsc, clubName, ageKey);
                values = await LoadImxRankDataAll(key, swimmerAgeMap);
                if (values.length > 0) {
                    // append real age to the end of each row
                    let idx = values.idx;
                    idx.age = values[0].length;
                    for (let row of values) {
                        let pkey = row[idx.pkey];
                        row.push(swimmerAgeMap.get(pkey));
                    }
                }
            } else {
                values = await LoadImxRankDataAll(key);
                values = await filterByAndAppendAge(values, ageKey, true);
            }

            // filter out all those age not equal to imxAge
            // for the swimmer just aged up, they will be filter out. Maybe, we can calulate the score by their new age.
            let idx = values.idx;
            let age = idx.age;
            let imxAge = idx.imxAge;
            values = filterDataBy(values, row => row[imxAge].includes(' ') || row[age] == row[imxAge]);
            removeDataIdx(values, 'imxAge');

            await appendSubArray(values, 'details', loadImxRankDetails, eventCount);

            values = mergeDupImxBest(values, eventCount);

            return truncateFetchData(values, 1000);
        });

        return await convertObject(values);
    }

    function mergeDupImxBest(values, detailsCount) {
        let idx = values.idx;
        let cacheTime = values.cacheTime;
        let detailsIdx = idx.details_Idx;
        let pkeyMap = new Map();
        for (let row of values) {
            let details = idx.details;
            if (row[details].length !== detailsCount) {
                continue;
            }

            let pkey = row[idx.pkey];
            let best = pkeyMap.get(pkey);
            if (!best) {
                pkeyMap.set(pkey, row);
            } else {
                best[idx.score] += mergeBest(best[details], row[details], detailsIdx.score);
            }
        }

        values = [...pkeyMap.values()].sort((a, b) => b[idx.score] - a[idx.score]);
        values.cacheTime = cacheTime;
        values.idx = idx;
        return values;
    }

    function mergeBest(details1, details2, score) {
        let delta = 0;
        for (let i = 0; i < details1.length; ++i) {
            let d1Score = details1[i][score];
            let d2Score = details2[i][score];

            if (d2Score > d1Score) {
                delta += d2Score - d1Score;
                details1[i] = details2[i];
            }
        }
        return delta;
    }

    async function LoadImxRankDataAll(mapKey, swimmerAgeMap) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(mapKey);
        let year = getSessionYear();
        let [imxType, _, course] = _eventList[event].split(' ');
        let years = course == 'SCY' ? [`${year - 1}-${year}`, `${year - 2}-${year - 1}`] : [`${year}`, `${year - 1}`];
        let seasonSuffix = imxType == 'IMR' ? ' (IMR)' : '';
        let [from, to] = decodeAgeKey(ageKey);
        let addition;
        if (from == 0) {
            addition = '8 & Under';
            from = 9;
        }
        if (to == 99) {
            addition = '19 & Over';
            to = 18;
        }

        let ages = Array.from({ length: to - from + 1 }, (_, i) => (from + i) + '');
        addition && ages.push(addition);

        let promises = [loadImxSeason(years[0]), loadImxSeason(years[1])];
        let results = await Promise.all(promises);
        if (!results[0] || !results[1]) {
            return;
        }
        let values = results[0].concat(results[1]);
        values.idx = results[0].idx;
        values.cacheTime = results[0].cacheTime;
        return values;

        async function loadImxSeason(year) {
            let bodyObj = {
                metadata: [
                    {
                        title: 'pkey',
                        dim: '[Person.personKey]'
                    },
                    {
                        title: 'name',
                        dim: '[Person.fullname]'
                    },
                    {
                        title: 'lsc',
                        dim: '[OrgUnit.Level3Code]'
                    },
                    {
                        title: 'clubName',
                        dim: '[OrgUnit.Level4Name]'
                    },
                    {
                        title: 'score',
                        dim: '[ImxSummary.ImxPoints]',
                        sort: 'desc'
                    },
                    // {
                    //     title: 'nationalRank',
                    //     dim: '[ImxSummary.NationalRank]'
                    // },
                    // {
                    //     title: 'zoneRank',
                    //     dim: '[ImxSummary.ZoneRank]'
                    // },
                    // {
                    //     title: 'lscRank',
                    //     dim: '[ImxSummary.LscRank]'
                    // },
                    {
                        title: 'details',
                        dim: '[ImxSummary.ImxSummaryKey]'
                    },
                    {
                        title: 'imxAge',
                        dim: '[Age.IMXAgeRange]',
                        filter: {
                            members: ages
                        }
                    },
                    {
                        title: 'imxType',
                        dim: '[ImxSeason.ImxType]',
                        filter: {
                            equals: imxType
                        },
                        panel: 'scope'
                    },
                    {
                        title: 'gender',
                        dim: '[CompetitionCategory.CompetitionCategoryKey]',
                        filter: {
                            equals: convertToGenderCode(genderStr)
                        },
                        panel: 'scope'
                    },
                    {
                        dim: '[ImxSeason.ImxSeasonName]',
                        filter: {
                            equals: `${course} ${year}${seasonSuffix}`
                        },
                        panel: 'scope'
                    }
                ],
                count: 1000
            };

            if (zone) {
                bodyObj.metadata.push({
                    dim: '[OrgUnit.Level2Code]',
                    filter: {
                        equals: zone
                    },
                    panel: 'scope'
                });
            }

            if (lsc) {
                bodyObj.metadata.push({
                    dim: '[OrgUnit.Level3Code]',
                    filter: {
                        equals: lsc
                    },
                    panel: 'scope'
                });
            }

            if (swimmerAgeMap) {
                bodyObj.metadata.push({
                    dim: '[Person.personKey]',
                    filter: {
                        members: [...swimmerAgeMap.keys()]
                    },
                    panel: 'scope'
                });
            }

            return await fetchSwimValues(bodyObj, 'club');
        }
    }

    async function loadImxRankDetails(key, map, eventCount) {
        let bodyObj = {
            metadata: [
                {
                    title: 'event',
                    dim: '[SwimEvent.SwimEventKey]',
                    sort: 'asc'
                },
                //   {
                //     title: 'meet',
                //     dim: '[Meet.MeetKey]',
                //   },
                {
                    title: 'date',
                    dim: '[ImxDetail.SwimDate (Calendar)]',
                    level: 'days'
                },
                {
                    title: 'time',
                    dim: '[ImxDetail.SwimTimeFormatted]'
                },
                {
                    title: 'score',
                    dim: '[ImxDetail.IMXPoints]'
                },
                {
                    title: key,
                    dim: '[ImxSummary.ImxSummaryKey]',
                    filter: {
                        members: [...map.keys()]
                    }
                }
            ],
            count: map.size * eventCount
        };

        let details = await fetchSwimValues(bodyObj, 'club');

        shortenDateField(details);

        return details;
    }

    async function filterByAndAppendAge(values, ageKey, notRemoveDup) {
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
                    dim: '[Persons.PersonKey]',
                    filter: {
                        members: [...pkeys]
                    }
                },
                {
                    title: 'age',
                    dim: '[Persons.Age]',
                    filter: {
                        from: from,
                        to: to
                    }
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
        let idx = values.idx;
        idx.age = values[0].length;
        let result = [];
        for (let row of values) {
            let pkey = row[idx.pkey];
            let realAge = pkeyAge.get(pkey);
            if (realAge) {
                row.push(realAge);
                result.push(row);
                !notRemoveDup && pkeyAge.delete(pkey);
            }
        }

        result.idx = idx;
        result.cacheTime = values.cacheTime;
        return result;
    }

    async function showRank(data, key) {
        let page = 'rank';
        let loadingHash = page + '/' + encodeURIComponent(key);
        let html = [];
        let customDatePicker = useCustomDatePicker();
        let customSelect = useCustomSelect();
        let meetDate = getMeetDate();
        let onchange = v => go(page, v);

        html.push('<div class="center-row p-l-space top-margin"><p>Age Group:</p>', createAgeGenderSelect(key, customSelect, onchange),
            '<p>Course:</p>', createCourseSelect(key, customSelect, onchange),
            '<p>Team:</p>', await buildClubSelect(key, customSelect, onchange), '</div>');

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let hide25 = ageKey != '8U' && !show25();
        html.push(showEventButtons(event, hide25, true, (event) => `${getGlobalName(go)}('rank', \`${getRankDataKey(genderStr, ageKey, event, zone, lsc, clubName)}\`)`));

        html.push(showRankTableTitle(key));

        html.push('<div class="center-row p-l-space top-margin"><p>Meet date:</p>');
        if (customDatePicker) {
            html.push(`<input id="datepicker" class="clickable" value="${meetDate}">`);
        } else {
            html.push(`<input type="date" id="datepicker" class="clickable" value="${meetDate}" onchange="${getGlobalName(onMeetDateChange)}(this.value,'${page}')">`);
        }
        html.push('<p>Meet cut:</p>', await buildStandardSelects(key, customSelect), '</div>');
        html.push('<div id="rank-table" class="top-margin"></div>');

        updateContent(html.join(''), loadingHash);

        if (data) {
            let table = document.getElementById('rank-table');
            table.data = data;
            table.key = key;
            await updateRankTable();
        }

        if (customDatePicker) {
            await initDatepicker(page);
        }

        if (_scroolToPkey) {
            let highlightElem = document.querySelector('.high-light');
            if (highlightElem) {
                highlightElem.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            }
            _scroolToPkey = null;
        }
    }

    async function showImxRank(data, key) {
        let page = 'rank';
        let loadingHash = page + '/' + encodeURIComponent(key);

        let customSelect = useCustomSelect();
        let onchange = v => go(page, v);

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let hide25 = ageKey != '8U' && !show25();

        let html = [
            '<div class="center-row p-l-space top-margin"><p>Age Group:</p>', createAgeGenderSelect(key, customSelect, onchange),
            '<p>Course:</p>', createCourseSelect(key, customSelect, onchange),
            '<p>Team:</p>', await buildClubSelect(key, customSelect, onchange), '</div>',
            showEventButtons(event, hide25, true, (event) => `${getGlobalName(go)}('rank',\`${getRankDataKey(genderStr, ageKey, event, zone, lsc, clubName)}\`)`),
            showRankTableTitle(key),
            await showImxRankTable(data, key)];

        updateContent(html.join(''), loadingHash);

        if (_scroolToPkey) {
            let highlightElem = document.querySelector('.high-light');
            if (highlightElem) {
                highlightElem.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            }
            _scroolToPkey = null;
        }
    }

    async function buildStandardSelects(key, custom) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

        // prepare the standard options
        let [from, to] = decodeAgeKey(ageKey);
        let eventMapSet = new Set();
        let meets = await getLscMeetCuts(zone, lsc);
        let options = [];
        for (let [name, meet] of meets) {
            for (let age = from; age <= to; ++age) {
                let eventMapInfo = meet.ageMap.get(age);
                if (!eventMapInfo || eventMapSet.has(eventMapInfo.eventMap)) {
                    continue;
                }
                eventMapSet.add(eventMapInfo.eventMap);
                let ageKey = ageRangeToAgeKey(...decodeAgeKey(eventMapInfo.ageRange));
                let cut = await getMeetCut(zone, lsc, name, age, genderStr, _eventList[event]);
                if (cut) {
                    let text = `${name.replace('_', ' ')} (${ageKey}) = ${cut[0]}`;
                    if (custom) {
                        let lines = meet.details.split('<br>').length;
                        text = createMeetNamePop(text, meet.details, `top:-${17 + lines * 18}px;left:-5px`, ' ');
                    }

                    options.push([text, `${name}|${ageKey}`, cut[1]]);
                }
            }
        }

        options.sort((a, b) => b[2] - a[2]);

        let html = [];
        // generate the standard selection
        for (let [i, cls] of ['gn', 'bl', 'rd'].entries()) {
            let values = [['', ''], ...options];

            // load the standard from local storage
            let standard = localStorage.getItem('meetStds' + i) || '';
            if (values.findIndex(v => v[1] == standard) < 0) {
                let [meetName, ageRange] = standard.split('|');
                standard = values.filter(v => v[1].split('|')[0] == meetName)[0]?.[1] || '';
                localStorage.setItem('meetStds' + i, standard);
            }

            let select = new Select('standard' + i, values, standard, async (value) => {
                localStorage.setItem('meetStds' + i, value);
                await updateRankTable();
            });
            select.class = cls;
            html.push(select.render(custom));
        }

        return html.join('');
    }

    async function onMeetDateChange(value, table) {
        localStorage.setItem('meetDate', value);

        if (table == 'rank') {
            await updateRankTable();
        } else if (table == 'relay') {
            await updateSelectionTable();
        }
    }

    async function updateRankTable() {
        let table = document.getElementById('rank-table');
        table.innerHTML = await showRankTable(table.data, table.key);
    }

    function showEventButtons(selectedEvent, hide25, showImx, onclick) {
        let html = [];
        let course = _eventList[selectedEvent].slice(-3);

        html.push('<div class="match-size top-margin">');
        for (let event of _eventOrderMap.get(course)) {
            if (event < 81 || (event > 90 && showImx) || !hide25) {
                let [d, s, c] = _eventList[event].split(' ');
                let seleted = event == selectedEvent ? ' selected' : '';
                let text = s == '_' ? d : `${s}<br>${d}`;
                html.push(`<button class="evt d${d} ${s}${seleted}" onclick="${onclick(event)}">${text}</button>`);
            }
        }
        html.push('</div>');
        return html.join('');
    }

    function showRankTableTitle(key) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let parts = _eventList[event].split(' ');
        parts[1] = _storkeMap.get(parts[1]);

        return [showRankTableMainTitle(key), '<h3>', parts.join(' '), ' &nbsp &nbsp ', ageKey, ' ', genderStr, '</h3>'].join('');
    }

    function showRankTableMainTitle(key) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

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
        html.push('</h2>');

        return html.join('');
    }

    async function showRankTable(data, key) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let [from, to] = decodeAgeKey(ageKey);
        let standardNames = (await getAgeGroupMotivationMap()).keys();
        let standards = [];
        for (let [i, clr] of ['gn', 'bl', 'rd'].entries()) {
            let [meetName, ageRange] = (localStorage.getItem('meetStds' + i) || '|').split('|');
            let cut = await getMeetCut(zone, lsc, meetName, parseInt(ageRange), genderStr, _eventList[event]);
            if (cut) {
                standards.push([cut, clr]);
            }
        }
        standards.sort((a, b) => a[0][1] - b[0][1]);

        let html = [];

        if (data.length == 0) {
            html.push('No ranking data found.');
            return html.join('');
        }

        html.push('<table class="hilightrow fill"><tbody><tr><th></th><th>Name</th><th>Time</th><th>Date</th><th>Age</th><th>Birthday</th><th>Team</th><th>LSC</th><th>Meet</th></tr>');
        let index = 0;
        for (let row of await filterDataByMeetDate(data, to)) {

            let maxStd = '';
            for (let std of standardNames) {
                let [_, stdInt] = await getAgeGroupMotivationTime(std, from, genderStr, _eventList[event]);
                if (row.timeInt > stdInt) {
                    break;
                }
                maxStd = std;
            }
            let color = '';
            for (let [std, clr] of standards) {
                if (row.timeInt <= std[1]) {
                    color = ` class="${clr}"`;
                    break;
                }
            }

            let rowZone = getLSCZone(row.lsc);
            let rowTeamRankKey = rowZone ? getRankDataKey(genderStr, ageKey, event, rowZone, row.lsc, row.clubName) : '';
            let rowlscRankKey = rowZone ? getRankDataKey(genderStr, ageKey, event, rowZone, row.lsc, '') : '';
            rowTeamRankKey = rowTeamRankKey == key ? '' : rowTeamRankKey;
            rowlscRankKey = rowlscRankKey == key ? '' : rowlscRankKey;

            let pkey = row.pkey;
            let hightlightPkey = pkey == _highLightPkey ? ` class="high-light"` : '';

            html.push(`<tr${color}${hightlightPkey}><td>`, ++index, '</td>', createSwimmerNameTd(row),
                '<td class="tc">', buildTimeCell(row.time, maxStd, row.score),
                '</td><td>', formatDate(row.date), '</td><td>', row.age, '<td class="left full">', await createBirthdayCell(pkey),
                `</td><td class="left${rowTeamRankKey ? ' full' : ''}">`, rowTeamRankKey ? createClickableDiv(row.clubName, `${getGlobalName(go)}('rank',\`${rowTeamRankKey}\`)`) : row.clubName,
                `</td><td class="left${rowlscRankKey ? ' full' : ''}">`, rowlscRankKey ? createClickableDiv(row.lsc, `${getGlobalName(go)}('rank','${rowlscRankKey}')`) : row.lsc,
                '</td><td class="left">', row.meetInfo.name, '</td></tr>');
        }
        html.push('</tbody></table>');
        return html.join('');
    }

    async function showImxRankTable(data, key) {
        if (!data || data.length == 0) {
            return 'No imx/imr ranking data found.';
        }

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let [from, to] = decodeAgeKey(ageKey);

        let html = [];

        if (data.length == 0) {
            html.push('No imx/imr ranking data found.');
            return html.join('');
        }

        html.push('<table class="hilightrow fill imx"><tbody><tr><th></th><th>Name</th><th>Score</th><th>Age</th>');
        for (let stk of data[0].details) {
            let [dist, stroke, course] = stk.eventStr.split(' ');
            html.push(`<th>${dist} ${_storkeMap.get(stroke)}</th>`);
        }
        html.push('<th>Birthday</th><th>Team</th><th>LSC</th></tr>');

        let index = 0;
        for (let row of data) {

            let rowZone = getLSCZone(row.lsc);
            let rowTeamRankKey = rowZone ? getRankDataKey(genderStr, ageKey, event, rowZone, row.lsc, row.clubName) : '';
            let rowlscRankKey = rowZone ? getRankDataKey(genderStr, ageKey, event, rowZone, row.lsc, '') : '';
            rowTeamRankKey = rowTeamRankKey == key ? '' : rowTeamRankKey;
            rowlscRankKey = rowlscRankKey == key ? '' : rowlscRankKey;

            let pkey = row.pkey;

            let hightlightPkey = pkey == _highLightPkey ? ` class="high-light"` : '';

            html.push(`<tr${hightlightPkey}><td>`, ++index, '</td>', createSwimmerNameTd(row), '<td>', row.score, '</td><td>', row.age, '</td>');

            for (let stk of row.details) {
                html.push('<td class="tc">', buildTimeCell(stk.time, stk.score, formatDate(stk.date)), '</td>');
            }
            html.push('<td class="left full">', await createBirthdayCell(pkey),
                `</td><td class="left${rowTeamRankKey ? ' full' : ''}">`,
                rowTeamRankKey ? createClickableDiv(row.clubName, `${getGlobalName(go)}('rank',\`${rowTeamRankKey}\`)`) : row.clubName,
                `</td><td class="left${rowlscRankKey ? ' full' : ''}">`,
                rowlscRankKey ? createClickableDiv(row.lsc, `${getGlobalName(go)}('rank','${rowlscRankKey}')`) : row.lsc,
                '</td></tr>');
        }

        html.push('</tbody></table>');
        return html.join('');
    }

    function filterOutSwimmer(meetDate, maxAge, range) {
        if (range && meetDate) {
            let bday = new Date(range[1]);
            bday.setUTCFullYear(bday.getUTCFullYear() + maxAge + 1);
            if (bday <= new Date(meetDate)) {
                return true;
            }
        }
        return false;
    }

    function createAgeGenderSelect(key, custom, onchange) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let values = [];
        for (let g of ['Female', 'Male', 'Mixed']) {
            values.push([g]);
            for (let ag of ['8U', '10U', '11-12', '13-14', '15-16', '17-18', '13-18', '19O']) {
                let value = getRankDataKey(g, ag, event, zone, lsc, clubName);
                values.push([ag + ' ' + g, value]);
            }
        }
        let select = new Select('age-gender-select', values, key, onchange);
        return select.render(custom);
    }

    function createCourseSelect(key, custom, onchange) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let values = [];
        let [dist, stroke, course] = _eventList[event].split(' ');
        for (let newCourse of _courseOrder) {
            let newEvent = fixDistance([dist, stroke, newCourse].join(' '));
            let newEventCode = _eventIndexMap.get(newEvent);
            newEventCode && values.push([newCourse, getRankDataKey(genderStr, ageKey, newEventCode, zone, lsc, clubName)]);
        }

        let select = new Select('course-select', values, key, onchange);
        return select.render(custom);
    }

    async function buildClubSelect(key, custom, onchange) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let values = [];

        values.push(['USA', getRankDataKey(genderStr, ageKey, event)]);

        values.push(['Zone']);
        for (let zoneCode of ['Central', 'Eastern', 'Southern', 'Western']) {
            values.push([zoneCode, getRankDataKey(genderStr, ageKey, event, zoneCode)])
        }

        if (zone) {
            values.push([zone + ' Zone']);
            for (let [lscCode, [lscName, zoneCode]] of lscMap) {
                if (zoneCode == zone) {
                    values.push([lscCode + ' - ' + lscName, getRankDataKey(genderStr, ageKey, event, zone, lscCode)]);
                }
            }
        }

        if (lsc) {
            let clubDict = await _clubDictinary.loadClubMap(lsc);

            values.push([getLSCName(lsc) + ' (' + lsc + ')']);
            for (let [clubName, clubCode] of clubDict) {
                values.push([clubCode + ' - ' + clubName, getRankDataKey(genderStr, ageKey, event, zone, lsc, clubName)]);
            }
        }

        let select = new Select('club-select', values, key, onchange);
        select.valueEqualtoSelection = (val, ops) => {
            let [genderStrVal, ageKeyVal, eventVal, zoneVal, lscVal, clubVal] = decodeRankMapKey(val);
            let [genderStrOps, ageKeyOps, eventOps, zoneOps, lscOps, clubOps] = decodeRankMapKey(ops);
            return clubOps ? clubVal == clubOps : lscOps ? lscVal == lscOps : zoneOps ? zoneVal == zoneOps : !zoneOps;
        };

        return select.render(custom);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // relay functions

    async function relay(key) {

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let [dist, stroke, course] = _eventList[event].split(' ');
        let newDist = getRelayDistance(event, ageKey);
        if (newDist != dist) {
            stroke = ['IM', '_'].includes(stroke) ? 'FR' : stroke;
            event = _eventIndexMap.get([newDist, stroke, course].join(' '));
            window.location.replace('#relay/' + getRankDataKey(genderStr, ageKey, event, zone, lsc, clubName));
            return;
        }

        document.title = _title + ' - Relay - ' + (decodeURIComponent(clubName) || lscMap.get(lsc)?.[0] || (zone ? zone + ' Zone' : 'USA'));
        TopButton.show('relay', false);
        TopButton.show('rank', key);

        await ensureToken();
        let data = await loadRelay(key);

        await showRelay(data, key);
    }
    _navFuncMap.set('relay', relay);

    async function loadRelay(key) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);

        let [dist, stroke, course] = _eventList[event].split(' ');
        let eventDelta = _eventIndexMap.get(dist + ' FR ' + course);

        let events = [10, 13, 16, 0].map(evt => evt + (parseInt(eventDelta) || 1));
        let promises = [];
        let genders = genderStr == 'Mixed' ? ['Female', 'Male'] : [genderStr];
        for (let gStr of genders) {
            for (let evt of events) {
                promises.push(loadRank(getRankDataKey(gStr, ageKey, evt, zone, lsc, clubName)));
            }
        }

        let results = await Promise.all(promises);

        let pkeyMap = new Map();
        let swimmers = [];
        let nameMap = new Map();

        let genderFactor = results.length == 8 ? 1 : 0;
        let maxTopCount = results.length == 8 ? 20 : 40;
        for (let [i, result] of results.entries()) {
            topCount = Math.min(maxTopCount, result.length);
            for (let j = 0; j < topCount; ++j) {
                let row = result[j];
                let pkey = row.pkey;
                let swimmer = pkeyMap.get(pkey);
                if (!swimmer) {
                    swimmer = {
                        pkey: pkey,
                        name: row.name,
                        age: row.age,
                        gender: i < 4 ? genderFactor : -genderFactor,
                        clubName: row.clubName
                    };
                    pkeyMap.set(pkey, swimmer);
                    nameMap.set(row.name.toLowerCase(), swimmer);
                    swimmers.push(swimmer);
                }
                swimmer[_relayOrder[i % 4]] = row.time;
                swimmer[_relayOrder[i % 4] + 'Int'] = timeToInt(row.time);
            }
        }

        swimmers = sortSwimmers(swimmers);

        return { swimmers, nameMap };
    }

    function sortSwimmers(swimmers) {
        let dt = 30000;
        let group = {};
        group[0] = [];
        group[1] = [];
        group[-1] = [];
        for (let row of swimmers) {
            group[row.gender].push(row);
            row.timeInt = (row.BKInt || dt) + (row.BRInt || dt) + (row.FLInt || dt) + (row.FRInt || dt);
        }
        for (let i = -1; i < 2; ++i) {
            group[i].sort((a, b) => a.timeInt - b.timeInt);
        }

        if (group[0].length > 0) {
            return group[0];
        }

        let mergedGroup = [];
        let len = Math.max(group[1].length, group[-1].length);
        for (let i = 0; i < len; i++) {
            if (i < group[1].length) {
                mergedGroup.push(group[1][i]);
            }
            if (i < group[-1].length) {
                mergedGroup.push(group[-1][i]);
            }
        }
        return mergedGroup;
    }

    async function showRelay(data, key) {
        let page = 'relay';
        let loadingHash = page + '/' + encodeURIComponent(key);

        let html = [];
        let customDatePicker = useCustomDatePicker();
        let customSelect = useCustomSelect();
        let meetDate = getMeetDate();
        let onchange = v => go(page, v);

        html.push('<div class="center-row p-l-space top-margin"><p>Age Group:</p>', createAgeGenderSelect(key, customSelect, onchange),
            '<p>Course:</p>', createCourseSelect(key, customSelect, onchange),
            '<p>Team:</p>', await buildClubSelect(key, customSelect, onchange), '</div>');

        html.push('<div class="center-row p-l-space top-margin"><p>Meet date:</p>');
        if (customDatePicker) {
            html.push(`<input id="datepicker" value="${meetDate}">`);
        } else {
            html.push(`<input type="date" id="datepicker" value="${meetDate}" onchange="${getGlobalName(onMeetDateChange)}(this.value,'${page}')">`);
        }
        html.push('<p>Distance:</p>', createDistanceSelect(key, customSelect, onchange), '</div>');

        html.push(showRankTableMainTitle(key));
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let [dist, stroke, course] = _eventList[event].split(' ');

        html.push(`<h3>${genderStr} ${ageKey} ${course} 4x${getRelayDistance(event)} Relay</h3>`);

        let expanderViewHtml = [
            '<div>Two methods to customize relay selections:</div>',
            `<p>1. Add or Edit swimmers' stroke times.</p>`,
            `<textarea style="width:600px;height:120px" oninput="${getGlobalName(updatePatchData)}(this.value)" `,
            `placeholder="Add/Edit swimmers' times in this textbox using the following format:\n`,
            '  {Gender [F|M]} {Swimmer Name} {Back Time} {Breast Time} {Fly Time} {Free Time}\n',
            'Use 0 to skip updating a stroke. Gender is optional.&#10;',
            'Example:\n  Gretchen Walsh 48.10 0 47.42 44.83\n  Michael Phelps 45.50 53.41 45.40 41.93\n  M Caeleb Dressel 0 0 42.80 39.90"></textarea>',
            '<p>2. Click the TIME cell in the following table to remove it from the relay selection.</p>',
            '<div id="selection-table"></div>'];

        let expander = new Expander('relay-table', 'Customization ▽', 'Customization △', expanderViewHtml.join(''));

        if (isNarrowWindow()) {
            html.push('<div class="top-margin">', expander.render(), '</div>');
            html.push(
                '<div class="top-margin one-row"><div class="col"><h4>Medley Relay</h4><div id="medley-relay-table"></div></div>',
                '<div class="col"><h4>Free Relay</h4><div id="free-relay-table"></div></div></div>');
        } else {
            html.push(
                '<div class="top-margin one-row"><div class="col"><h4>Medley Relay</h4><div id="medley-relay-table"></div></div>',
                '<div class="col"><h4>Free Relay</h4><div id="free-relay-table"></div></div><div class="col">', expander.render(), '</div></div>');
        }

        updateContent(html.join(''), loadingHash);

        if (customDatePicker) {
            await initDatepicker(page);
        }

        if (data) {
            let table = document.getElementById('relay-table');
            table.data = data;
            data.key = key;
            data.exclude = [new Set(), new Set(), new Set(), new Set()];
            await updatePatchData('');
        }
    }

    async function updatePatchData(value) {
        let patch = parseText(value);

        mergePatchData(patch);

        await updateSelectionTable();
    }

    function parseText(value) {
        let patch = [];

        for (let line of value.split('\n')) {
            line = line.trim().replace(/\t/g, ' ').replace(/ +/g, ' ');
            let index = line.search(/\d/);
            if (index <= 0 || line[index - 1] != ' ') {
                continue;
            }
            let hasTime = false;
            let times = line.substring(index).split(' ');
            for (let i = 0; i < times.length; ++i) {
                times[i] = timeToInt(times[i]);
                hasTime = hasTime || times[i] > 0;
            }
            if (!hasTime) {
                continue;
            }

            let gender = '';
            let nameStart = 0;
            if (line.startsWith('F ') || line.startsWith('M ')) {
                nameStart = 2;
                gender = line[0];
            }

            let name = line.substring(nameStart, index - 1);
            let swimmer = { name: name, times: times, gender: gender };
            patch.push(swimmer);
        }

        return patch;
    }

    function mergePatchData(patch) {
        let data = document.getElementById('relay-table').data;
        let nameMap = data.nameMap;

        function patchSwimmerData(swimmer, patchRow) {
            if (swimmer != patchRow) {
                swimmer = JSON.parse(JSON.stringify(swimmer));
            }

            for (let [i, stroke] of _relayOrder.entries()) {
                if (patchRow.times[i]) {
                    let time = swimmer[stroke + 'Int'] = patchRow.times[i];
                    swimmer[stroke] = formatTime(time);
                }
            }
            return swimmer;
        }

        let merged = [];
        let needToUpdate = new Map();
        for (let patchRow of patch) {
            let nameKey = patchRow.name.toLowerCase();
            let swimmer = nameMap.get(nameKey);
            if (!swimmer) {
                patchRow.pkey = nameKey;
                patchRow.gender = data.swimmers[0]?.gender ? (patchRow.gender == 'M' ? -1 : 1) : 0;
                merged.push(patchSwimmerData(patchRow, patchRow));
            } else {
                needToUpdate.set(swimmer.pkey, patchSwimmerData(swimmer, patchRow));
            }
        }

        // replace the needToUpdate swimmers in the data
        for (let swimmer of data.swimmers) {
            if (needToUpdate.has(swimmer.pkey)) {
                merged.push(needToUpdate.get(swimmer.pkey));
            } else {
                merged.push(swimmer);
            }
        }

        data.merged = merged;
    }

    function createSwimmerNameTd(swimmer, fakeSwimmer) {
        let genderStr = swimmer.gender ? `<span class="gender">${swimmer.gender == 1 ? '♀' : '♂'}</span>` : '';

        return `<td class="left${fakeSwimmer ? '' : ' full'}">` +
            (fakeSwimmer ? genderStr + swimmer.name : createClickableDiv(genderStr + '<span class="underline">' + swimmer.name + '</span>', `${getGlobalName(go)}('swimmer',${swimmer.pkey})`, 'no-dec')) +
            '</td>';
    }

    async function updateSelectionTable() {
        let data = document.getElementById('relay-table').data;
        let exclude = data.exclude;

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(data.key);
        let [from, to] = decodeAgeKey(ageKey);
        let meetDate = getMeetDate();

        let html = ['<table class="fill"><tbody><tr><th>Name</th><th>Back</th><th>Breast</th><th>Fly</th><th>Free</th><th>Age</th><th>Birthday</th></tr>'];

        for (let swimmer of data.merged) {
            let realSwimmer = typeof swimmer.pkey == 'number';

            html.push('<tr>', createSwimmerNameTd(swimmer, !realSwimmer));

            for (let [i, stroke] of _relayOrder.entries()) {
                let deselected = exclude[i].has(swimmer.pkey) ? ' deselected' : '';
                if (swimmer[stroke]) {
                    html.push(`<td class="leg-time clickable${deselected}" onclick="${getGlobalName(deselectRelayStroke)}(this,${i},'${swimmer.pkey}')">`, swimmer[stroke], '</td>');
                } else {
                    html.push('<td></td>');
                }
            }

            html.push('<td>', swimmer.age);

            if (realSwimmer) {
                let range = await _birthdayDictionary.load(swimmer.pkey);
                let css = filterOutSwimmer(meetDate, to, range) ? ' deselected' : '';
                html.push(`</td><td class="left full${css}">`, await createBirthdayCell(swimmer.pkey, updateSelectionTable, range), '</td></tr>');
            } else {
                html.push('</td><td></td></tr>');
            }
        }

        html.push('</tbody></table>');

        let table = document.getElementById('selection-table');
        table.innerHTML = html.join('');

        await updateRelayTables();
    }

    async function deselectRelayStroke(elememt, legIndex, pkey) {
        pkey = parseInt(pkey) || pkey;
        elememt.classList.toggle('deselected');
        let exclude = document.getElementById('relay-table').data.exclude;
        if (exclude[legIndex].has(pkey)) {
            exclude[legIndex].delete(pkey);
        } else {
            exclude[legIndex].add(pkey);
        }

        await updateRelayTables();
    }

    async function updateRelayTables() {
        let data = document.getElementById('relay-table').data;

        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(data.key);
        let [from, to] = decodeAgeKey(ageKey);

        let filtered = await filterDataByMeetDate(data.merged, to);

        let rankings = filterByExclusionAndGenerateRankings(filtered, data.exclude);

        let relays = calculateRelay(rankings);
        updateRelayTable(relays, 'medley');

        relays = pickFreeRelays(rankings);
        updateRelayTable(relays, 'free');
    }

    function pickFreeRelays(rankings) {
        let relays = [];

        if (rankings.length == 4) {
            let swimmers = rankings[3];
            for (let i = 0; i + 4 <= swimmers.length; i += 4) {
                let relay = swimmers.slice(i, i + 4);
                let time = relay.reduce((acc, swimmer) => acc + swimmer.FRInt, 0);
                relays.push([time, relay]);
            }
        } else {
            let swimmers1 = rankings[3];
            let swimmers2 = rankings[7];
            let len = Math.min(swimmers1.length, swimmers2.length);
            for (let i = 0; i + 2 <= len; i += 2) {
                let relay = [...swimmers1.slice(i, i + 2), ...swimmers2.slice(i, i + 2)];
                relay.sort((a, b) => a.FRInt - b.FRInt);
                let time = relay.reduce((acc, swimmer) => acc + swimmer.FRInt, 0);
                relays.push([time, relay]);
            }
        }

        return relays;
    }

    function filterByExclusionAndGenerateRankings(swimmers, exclude) {
        let result = swimmers[0]?.gender ? [[], [], [], [], [], [], [], []] : [[], [], [], []];
        for (let swimmer of swimmers) {
            for (let [i, stroke] of _relayOrder.entries()) {
                if (swimmer[stroke] && !exclude[i].has(swimmer.pkey)) {
                    i += swimmer.gender == -1 ? 4 : 0;
                    result[i].push(swimmer);
                }
            }
        }

        for (let [i, swimmer] of result.entries()) {
            let key = _relayOrder[i % 4] + 'Int';
            swimmer.sort((a, b) => a[key] - b[key]);
        }

        return result;
    }

    async function filterDataByMeetDate(swimmers, maxAge) {
        let meetDate = getMeetDate();
        let result = [];
        for (let swimmer of swimmers) {
            let range = await _birthdayDictionary.load(swimmer.pkey);
            if (filterOutSwimmer(meetDate, maxAge, range)) {
                continue;
            }
            result.push(swimmer);
        }
        return result;
    }

    async function initDatepicker(table) {
        let root = getFileRoot();
        loadCSS(`${root}datepicker.material.css`);
        await loadScript(`${root}datepicker.js`);
        new Datepicker('#datepicker', {
            serialize: (date) => {
                let str = typeof date === 'string' ? date : date.toJSON().substring(0, 10);
                let part = str.split('-');
                return part[1] + '/' + part[2] + '/' + part[0];
            },
            onChange: date => {
                date = date || new Date();
                onMeetDateChange(date.toJSON().substring(0, 10), table);
            }
        });
    }

    function createDistanceSelect(key, custom, onchange) {
        let [genderStr, ageKey, event, zone, lsc, clubName] = decodeRankMapKey(key);
        let [dist, stroke, course] = _eventList[event].split(' ');
        dist = getRelayDistance(event);
        let selections = [
            [50, _eventIndexMap.get('50 FR ' + course)],
            [100, _eventIndexMap.get('100 FR ' + course)],
            [200, _eventIndexMap.get('200 FR ' + course)]];
        let values = [];
        let selected;
        for (let [dis, evt] of selections) {
            let relayKey = getRankDataKey(genderStr, ageKey, evt, zone, lsc, clubName);
            values.push([`4x${dis}`, relayKey]);
            if (dis == Number(dist)) {
                selected = relayKey;
            }
        }

        let select = new Select('dist-select', values, selected, onchange);
        return select.render(custom);
    }

    function getRelayDistance(event, ageKey) {
        let [dist, stroke, course] = _eventList[event].split(' ');
        dist = Number(dist) || 100;
        return dist > 200 ? 200 : dist < 50 ? 50 : dist;
    }

    function updateRelayTable(relays, type) {
        let html = [];
        for (let [time, swimmers] of relays) {
            html.push('<p class="relay-time">', formatTime(time), '</p><table class="fill"><tbody>');
            for (let [i, swimmer] of swimmers.entries()) {
                if (type == 'medley') {
                    let stroke = _relayOrder[i];
                    html.push('<tr>', createSwimmerNameTd(swimmer), '<td>', swimmer[stroke], '</td><td>', stroke, '</td></tr>');
                } else {
                    html.push('<tr>', createSwimmerNameTd(swimmer), '<td>', swimmer.FR, '</td></tr>');
                }
            }
            html.push('</tbody></table>');
        }

        document.getElementById(type + '-relay-table').innerHTML = html.join('');
    }

    function calculateRelay(rankings) {
        let picked = new Set();
        let relays = [];
        for (; ;) {
            let relay = calculateRelayGroup(rankings, picked);
            if (relay.length == 1) {
                break;
            }
            relays.push(relay);
            for (let swimmer of relay[1]) {
                picked.add(swimmer.pkey);
            }
        }

        return relays;
    }

    function calculateRelayGroup(rankings, picked) {
        let top4 = [[], [], [], []];
        let pickCount = rankings.length == 4 ? 4 : 2;

        for (let [i, leg] of rankings.entries()) {
            let top = top4[i % 4];
            let count = 0;
            for (let swimmer of leg) {
                if (!picked.has(swimmer.pkey)) {
                    top.push(swimmer);
                    if (++count >= pickCount) {
                        break;
                    }
                }
            }
        }

        let relay = [Infinity]; // [timeInt, [swimmer1, swimmer2, swimmer3, swimmer4]]
        dfsSearch(top4, picked, [], 0, 0, relay);
        return relay;
    }

    function dfsSearch(tops, picked, relay, gender, timeInt, bestRelay) {
        if (4 == relay.length) {
            if (gender != 0) {
                return;
            }
            if (timeInt < bestRelay[0]) {
                bestRelay[0] = timeInt;
                bestRelay[1] = [...relay];
            }
            return;
        }

        let strokeIndex = relay.length;
        let strokeTimeKey = _relayOrder[strokeIndex] + 'Int';
        let leg = tops[strokeIndex];

        for (let swimmer of leg) {
            if (!picked.has(swimmer)) {
                picked.add(swimmer);
                relay.push(swimmer);
                dfsSearch(tops, picked, relay, gender + swimmer.gender, timeInt + swimmer[strokeTimeKey], bestRelay);
                relay.pop();
                picked.delete(swimmer);
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
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
                    'v': value
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
            }
        }
        const exported = {
            'get': ldb.get,
            'set': ldb.set,
            'delete': ldb.delete,
            'list': ldb.list,
            'getAll': ldb.getAll,
            'clear': ldb.clear
        };
        win['ldb'] = exported
        if (typeof module !== 'undefined') {
            module.exports = exported;
        }
    })();


    let lscMap = (function () {
        let data = `
AD|Adirondack|Eastern
AK|Alaska|Western|west-nw
AM|Allegheny Mountain|Eastern
AR|Arkansas|Central|cent-south
AZ|Arizona|Western|west-4c,west-farwest
BD|Border|Southern|south-west
CC|Central California|Western|west-canv
CO|Colorado|Western|west-4c
CT|Connecticut|Eastern
FL|Florida|Southern|south-south
FG|Florida Gold Coast|Southern|south-south
GA|Georgia|Southern|south-east
GU|Gulf|Southern|south-west
HI|Hawaiian|Western|west-nw,west-farwest
IL|Illinois|Central|cent-north
IN|Indiana|Central|cent-east
IE|Inland Empire|Western|west-nw
IA|Iowa|Central|cent-north
KY|Kentucky|Southern|south-east
LE|Lake Erie|Central|cent-east
LA|Louisiana|Southern|south-west
ME|Maine|Eastern
MD|Maryland|Eastern
MR|Metropolitan|Eastern
MI|Michigan|Central|cent-east
MA|Middle Atlantic|Eastern
MW|Midwestern|Central|cent-south
MN|Minnesota|Central|cent-north
MS|Mississippi|Southern|south-east
MV|Missouri Valley|Central|cent-south
MT|Montana|Western|west-nw
NE|New England|Eastern
NJ|New Jersey|Eastern
NM|New Mexico|Western|west-4c
NI|Niagara|Eastern
NC|North Carolina|Southern|south-east
ND|North Dakota|Central|cent-north
NT|North Texas|Southern|south-west
OH|Ohio|Central|cent-east
OK|Oklahoma|Central|cent-south
OR|Oregon|Western|west-nw
OZ|Ozark|Central|cent-south
PC|Pacific|Western|west-canv,west-farwest
PN|Pacific Northwest|Western|west-nw
PV|Potomac Valley|Eastern
SI|San Diego-Imperial|Western|west-canv,west-farwest
SN|Sierra Nevada|Western|west-canv,west-farwest
SR|Snake River|Western|west-nw
SC|South Carolina|Southern|south-east
SD|South Dakota|Central|cent-north
ST|South Texas|Southern|south-west
SE|Southeastern|Southern|south-east
CA|Southern California|Western|west-canv,west-farwest
UT|Utah|Western|west-4c
VA|Virginia|Eastern
WT|West Texas|Southern|south-west
WV|West Virginia|Southern|south-east
WI|Wisconsin|Central|cent-north
WY|Wyoming|Western|west-nw`;
        let lines = data.split('\n');
        let map = new Map();
        for (let line of lines) {
            let parts = line.split('|');
            if (parts.length >= 3) {
                map.set(parts.shift(), parts);
            }
        }
        return map;
    })();

    function getLSCName(lsc) {
        return (lscMap.get(lsc) || ['', ''])[0];
    }

    function getLSCZone(lsc) {
        return (lscMap.get(lsc) || ['', ''])[1];
    }

    function parseMeetCut(data) {
        let firstError = true;
        function alertError(msg) {
            console.error(msg);
            if (isRunningLocally() && firstError) {
                alert(msg);
                firstError = false;
            }
        }

        let meets = new Map();
        let age, gender, course, meet, cols, eventIndex, columnNum;
        let setInfo = text => {
            let parts = text.split(':');
            for (let part of parts) {
                if (['M', 'F'].includes(part)) {
                    gender = part;
                } else if (_courseOrder.includes(part)) {
                    course = part;
                } else if (!isNaN(part.replace('-', ''))) {
                    age = part;
                } else {
                    meet = meets.get(part);
                    if (!meet) {
                        alertError(`Wrong meet name: ${part}, row: ${text}`);
                        continue;
                    }
                }
            }
        };

        for (let [rowNumber, row] of data.split('\n').entries()) {
            if (row.startsWith('#') || row === '') {
                continue;
            }
            if (row.startsWith('meet')) {
                let part = row.split(' ');
                part.shift();
                let meet = {
                    name: part.shift(),
                    details: part.join(' '),
                    ageMap: new Map(),
                    times: new Map()
                };
                meets.set(meet.name, meet);
                continue;
            }
            if (row.startsWith('table')) {
                meet = age = gender = course = null;
                cols = row.split(' ');
                cols.shift();// remove 'table'
                setInfo(cols.shift());
                eventIndex = cols.indexOf('EVENT');
                columnNum = cols.length;
                continue;
            }

            let parts = row.split(' ');
            if (parts.length !== columnNum) {
                alertError(`ColumnNum = ${columnNum}: not match row[${rowNumber}]: ${row}`);
                continue;
            }
            let event = parts[eventIndex].replace(/^(\d+)(.+)$/, '$1 $2');

            for (let [i, time] of parts.entries()) {
                if (i === eventIndex || !time.includes('.')) {
                    continue;
                }
                setInfo(cols[i]);
                let eventMap = meet.times.get(age) || new Map();
                meet.times.set(age, eventMap);
                let ageRange = age.includes('-') ? age : age + '-' + age;
                let [low, high] = ageRange.split('-').map(x => parseInt(x));
                for (let a = low; a <= high; a++) {
                    meet.ageMap.set(a, { ageRange: age, eventMap: eventMap });
                }
                event = course == 'SCY'
                    ? event.replace(/^400 FR$/, '500 FR').replace(/^800 FR$/, '1000 FR').replace(/^1500 FR$/, '1650 FR')
                    : event.replace(/^500 FR$/, '400 FR').replace(/^1000 FR$/, '800 FR').replace(/^1650 FR$/, '1500 FR');
                if (!_eventIndexMap.has(event + ' ' + course)) {
                    alertError(`Unknown event: ${event}, row[${rowNumber}]: ${row}`);
                    continue;
                }
                let key = event + ' ' + course + ' ' + gender;
                if (eventMap.has(key)) {
                    alertError(`Duplicate event: ${key}, row[${rowNumber}]: ${row}`);
                    continue;
                }
                eventMap.set(key, [time, timeToInt(time)]);
            }
        }

        return meets;
    }

    async function getMeetCut(zone, lsc, meetName, age, genderStr, event) {
        let meets = await getLscMeetCuts(zone, lsc);
        if (genderStr == 'Mixed') {
            return;
        }
        return meets.get(meetName)?.ageMap.get(age)?.eventMap.get(event + ' ' + genderStr[0]);
    }

    function getMeetCutFileRoot() {
        return isRunningLocally() ? '../meet-cut/' : 'https://usaswimming.blob.core.windows.net/meet-cut/';
    }

    async function getLscMeetCuts(zone, lsc) {
        // meet dictionary is cached in the runtime cache but the meed file is cached in the local cache
        return await RuntimeCache.func(`meet-cut/${lsc}`, async () => {
            let root = getMeetCutFileRoot();
            let meetCuts = new Map();

            async function loadMeetsFromFile(file) {
                try {
                    let data = await getFileData(file);
                    for (let [name, meet] of parseMeetCut(data || '')) {
                        meetCuts.set(name, meet);
                    }
                } catch (e) {
                    console.error(e.stack);
                }
            }

            if (lsc) {
                let files = (lscMap.get(lsc)[2] || '').split(',');
                for (let file of files) {
                    if (file) {
                        await loadMeetsFromFile(`${root}meet-${file}.js`);
                    }
                }
                await loadMeetsFromFile(`${root}meet-${lsc.toLowerCase()}.js`);
            }
            if (zone) {
                await loadMeetsFromFile(`${root}meet-${zone.toLowerCase()}.js`);
            }
            await loadMeetsFromFile(`${root}meet-usa.js`);

            return meetCuts;
        });
    }

    async function getAgeGroupMotivationMap(single) {
        let file = single ? 'meet-age-single-motivation.js' : 'meet-age-group-motivation.js';

        // meet dictionary is cached in the runtime cache but the meed file is cached in the local cache
        return await RuntimeCache.func('meet-cut/' + file, async () => {
            try {
                let root = getMeetCutFileRoot();
                let data = await getFileData(`${root}${file}`);
                return parseMeetCut(data);
            } catch (e) {
                console.error(e.stack);
            }
        });
    }

    async function getAgeGroupMotivationTime(meetName, age, genderStr, event, single) {
        let meets = await getAgeGroupMotivationMap(single);
        return meets.get(meetName)?.ageMap.get(age)?.eventMap.get(event + ' ' + genderStr[0]) || ['', 0];
    }

    async function getFileData(file) {
        let _getFileData = async () => {
            try {
                let script = await loadScript(file);
                script.data = script.data || G.fileData;
                delete G.fileData;
                return script.data;
            } catch (e) {
                console.error(e.stack);
            }
        };

        if (isRunningLocally()) {
            return await _getFileData();
        }

        let cacheKey = "file/" + file;
        return await LocalCache.func(cacheKey, _getFileData, _1DayInSec, 4);
    }

})();