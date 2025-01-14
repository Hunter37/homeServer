debugger;
(() => {
    // https://www.socalswim.org/time-standards
    // run following code in browser console

    // clear();
    // let table = document.getElementById('tb1112');
    // document.body.innerHTML = '';
    // document.body.appendChild(table);
    // document.body.innerHTML += '<style>td {background:#FFF;}</style>';

    function meetName(name) {
        return name.trim()
            .replace('SA G', 'SAG')
            .replace(/Elite$/, 'Elite Ch')
            .replace(/^Nat.*/, '')
            .replace('Short Course Yards', '')
            .replace('Long Course Meters', '')
            .replace('Short Course Meters', '')
            .replace(/\s+/g, '_');
    }

    let html = ['<pre style="background-color:white;color:black;position:fixed;left:0;top:0;bottom:0;right:0;">\n'];

    let meets = new Map();
    for (let table of document.querySelectorAll('table')) {
        for (let tr of table.querySelectorAll('tr')) {
            let text = tr.querySelector('td').innerText.trim();
            if (!text || !parseInt(text)) {
                for (let td of tr.querySelectorAll('td')) {
                    let name = meetName(td.innerText);
                    name && meets.set(name, td.innerText);
                }
            }
        }
    }

    for (let [name, text] of meets) {
        html.push(`\nmeet:${name}:${text}`);
    }

    let ageMap = new Map([
        ['58', '0-8'],
        ['510', '0-10'],
        ['1112', '11-12'],
        ['1314', '13-14'],
        ['1516', '15-16'],
        ['1718', '17-18'],
        ['scy', '11-99'],
        ['lcm', '11-99'],
    ]);

    let courseMap = new Map([
        ['Short Course Yards', 'SCY'],
        ['Long Course Meters', 'LCM'],
        ['Short Course Meters', 'SCM']
    ]);

    let genderMap = new Map([
        ['tg', 'F'],
        ['tb', 'M']
    ]);

    let columnInfo = [];
    let needHeader = false;
    for (let table of document.querySelectorAll('table')) {
        let age = ageMap.get(table.id.substring(2));
        let gender = genderMap.get(table.id.substring(0, 2));
        for (let tr of table.querySelectorAll('tr')) {
            if (tr.innerText.trim() == '') {
                html.push('#\n');
                continue;
            }

            let firstTdText = tr.querySelector('td').innerText;
            if (firstTdText.includes('Relay')) {
                continue;
            }

            if (!parseInt(firstTdText)) {
                // save table column info
                columnInfo = [];
                needHeader = true;
                for (let td of tr.querySelectorAll('td')) {
                    if (td.innerText != firstTdText) {
                        columnInfo.push(meetName(td.innerText));
                    }
                }

                let course = courseMap.get(firstTdText);
                if (course) {
                    // print table info
                    html.push(`\ntable ${course}:${age}:${gender} EVENT `);
                    for (let meet of columnInfo) {
                        if (meets.has(meet)) {
                            html.push(meet, ' ');
                        }
                    }
                    html.push('\n\n');
                    needHeader = false;
                }

                continue;
            }

            let course = firstTdText.replace(/\s+/g, ' ').split(' ')[1];
            if (needHeader && ['SCY', 'LCM', 'SCM'].indexOf(course) > -1) {
                // print table info
                html.push(`\ntable ${course}:${age}:${gender} EVENT `);
                for (let meet of columnInfo) {
                    if (meets.has(meet)) {
                        html.push(meet, ' ');
                    }
                }
                html.push('\n\n');
                needHeader = false;
            }

            let index = 0;
            for (let td of tr.querySelectorAll('td')) {

                if (td.innerText.includes('SCY') || td.innerText.includes('LCM') || td.innerText.includes('SCM')) {
                    let text = td.innerText.replace('SCY', '').replace('LCM', '').replace('SCM', '')
                        .replace('Free', 'FR').replace('Back', 'BK').replace('Breast', 'BR').replace('Fly', 'FL')
                        .replace('Ind Medley', 'IM').replace(/\s+/g, ' ');
                    html.push(text);
                    continue;
                }

                if (meets.has(columnInfo[index++])) {
                    let text = td.innerText.replace('TBD', '-').replace('N/A', '-').trim();
                    html.push('\t', text);
                }
            }
            html.push('\n');
        }
    }

    html.push('</pre>');
    document.body.innerHTML = html.join('');
})();