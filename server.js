const argv = require('argv');
const express = require('express');
const fs = require('fs');
const http = require('http');
const morgan = require('morgan');
const url = require('url');
const {execFile} = require('child_process');

/*
 * get my IP
 */

var myself = null;
http.get('http://httpbin.org/ip', (response) => {
    let data = '';
    response.on('data', chunk => { data += chunk; });
    response.on('end', () => {
        myself = JSON.parse(data).origin;
        console.log(`I am ${myself}`);
    });
});

/*
 * argparse
 */

argv.option([
    {
        name: 'port',
        short: 'P',
        type: 'int'
    }
]);

var args = argv.run();
args.options.port = args.options.port || 8084;
console.log(args);

/*
 * Express
 */

var app = express();
app.use(morgan('dev', {immediate: true}));

/*
 * index page
 */

app.get('/books', (req, res) => {
    fs.readFile("resources/index.html", (err, data) => {
        data = data.toString().replace(/@MYSELF/g, `http://${myself}:${args.options.port}`);
        res.writeHead(200);
        res.end(data);
    });
});
app.get('/', (req, res) => { res.redirect('/books'); });
app.get('/book', (req, res) => { res.redirect('/books'); });

/*
 * booklog command API
 */
function search(words, cont) {
    execFile('scripts/bookshelf', ['search'].concat(words), cont);
}

function update(cont) {
    console.log("Updating...");
    execFile('scripts/bookshelf', ['update'], () => {
        console.log("Updated");
    });
}

/*
 * API
 */

function get_query(request_url) {
    let query = url.parse(request_url, true).query;
    if (query.q === undefined || query.q === '') return false;
    let words = query.q.split(',').filter(w => w.length > 0);
    if (words.length == 0) return false;
    return words
}

app.get('/books/api/bookshelf', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let words = get_query(req.url);
    if (words) {
        console.log(`Command: ${words}`);
        search(words, (err, stdout, stderr) => {
            if (stdout) {
                res.send(stdout);
            } else {
                res.send([]);
            }
        });
    } else {
        res.send([]);
    }
});

/*
 * Server starts
 */

update();
setInterval(update, 10 * 60 * 1000);

app.listen(args.options.port, () => {
    console.log(`Listen on ${args.options.port}`);
});
