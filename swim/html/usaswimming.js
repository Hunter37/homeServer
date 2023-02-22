// https://hub.usaswimming.org/

//let token = await getToken();
//console.log(JSON.stringify(await findUsaSwimmer('Boyu Chen', '01/04/2011 - 01/04/2011', token), null, 4))

document.body.innerHTML='<input id="name"><input id="bday"><button id="run">Search</button><div id="content"></div>';

let contentElem = document.getElementById('content');
let nameElem = document.getElementById('name');
let bdayElem = document.getElementById('bday');

nameElem.addEventListener('keypress', (event) => {
    if (event.key == 'Enter') {
        search();
    }
});

bdayElem.addEventListener('keypress', (event) => {
    if (event.key == 'Enter') {
        search();
    }
});

document.getElementById('run').addEventListener('click', () => {
    search();
});

function log(str) {
    contentElem.innerHTML += '<div>' + str + '</div>';
}

let token = null;

async function search() {
    if (!token) {
        token = await getToken();
    }
    contentElem.innerHTML = 'Searching...';
    let data = await findUsaSwimmer(nameElem.value, bdayElem.value, token);
    if (data) {
        log('<pre>' + JSON.stringify(data, null, 4) + '</pre>');
    } else {
        log('Not exist');
    }
}

async function getToken() {
    let resp = await fetch('https://securityapi.usaswimming.org/security/Account/Login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "username": "Hunterpgo2",
            "password": "Biosfire;37"
        })
    });
    let body = await resp.json();
    return body.accessToken;
}

async function usaSwimming(first, last, birthday, token) {
    const url = 'https://personapi.usaswimming.org/swims/Person/omr/query/dupcheck?firstName='
        + first + '&lastName=' + last + '&birthDate=' + birthday;

    if (!token.startsWith('Bearer ')) {
        token = 'Bearer ' + token;
    }

    const response = await fetch(url,
        {
            headers: {
                'Authorization': token
            }
        });

    return await response.json();
}

async function findUsaSwimmer(name, date, token) {
    name = name.split(' ');
    let first = name[0];
    let last = name[1];
    date = date.split(' - ');
    let begin = date[0];
    let end = date[1];
    if (end.length < 6) {
        end = begin.split('/')[0] + '/' + end;
    }
    begin = new Date(begin);
    end = new Date(end);
    for (let day = begin; day.getTime() <= end.getTime(); day.setDate(day.getDate() + 1)) {
        let dateStr = day.toLocaleDateString('en-US');
        log(dateStr);
        let result = await usaSwimming(first, last, day.toLocaleString('en-US'), token);
        if (result.length > 0) {
            console.log(result);
            log('"Birthday":"' + result[0].birthDate.substring(0, 10).replaceAll('-', '/') + '",');
            if (result[0].preferredName.trim() && result[0].preferredName != result[0].firstName) {
                log('"Alias":"' + result[0].preferredName + ' ' + result[0].lastName + '",');
            }
            if (result[0].middleName.trim()) {
                log('"Middle":"' + result[0].middleName + '",');
            }
            return result;
        }
    }
    return null;
}
