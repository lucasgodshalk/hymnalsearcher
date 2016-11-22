var exec = require('child_process').exec;
var express = require('express')
var app = express()

var path = require("path");
var fs = require('fs');

var jsonPath = path.join(__dirname, 'hymns.json');

var jsonCache = null;
function getJson(callback) {
    if (!!jsonCache) {
        callback(jsonCache);
    }
    else {
        fs.readFile(jsonPath, { encoding: 'utf-8' }, function (err, data) {
            var json = JSON.parse(data);
            jsonCache = json;
            callback(json);
        });
    }
}

function textSearch(phrase, callback) {
    exec("grep -nr '" + phrase.replace("'", "").replace(":", "") + "*' ./hymnsText", function (error, stdout, stderr) {
        if (!error) {
            var list = stdout.split(/\n/);
            list.pop();
            list = list.map(entry => {
                var fullPath = entry.split(":")[0];
                return path.basename(fullPath).slice(0, -4);
            });

            getJson(json => {
                var options = [];
                for (var number of list) {
                    for (var item of json) {
                        if (item.number == parseInt(number)) {
                            options.push(item);
                        }
                    }
                }
                callback(options);
            });
        } else {
            console.log("error searching " + JSON.stringify(phrase));
        }
    });
}

function nameSearch(name, callback) {
    getJson(json => {
        var options = [];
        for (var item of json) {
            if (item.name.toLowerCase().includes(name.toLowerCase())) {
                options.push(item);
            }
        }
        callback(options);
    });
}

app.get('/hymns', function (req, res) {
    var number = req.query.number;
    if (!number) {
        res.status(404);
        res.type('txt').send('Hymn not found');
    }
    else {
        var path = "./hymnsPDF/" + number + ".txt";
        if (!!number && fs.existsSync(path)) {
            res.sendFile(path, { root: __dirname });
        }
        else {
            res.status(404);
            res.type('txt').send('Hymn not found');
        }
    }
});

app.get('/search', (req, res) => {
    var phrase = req.query.phrase;
    var name = req.query.name;

    var buildHtml = list => {
        var resultHtml = list.map(x => "<p><a href=\"/hymns?number=" + x.number + "\">" + "(" + x.number + ") " + x.name + "</a></p>").join("");
        var html = "<html><body>" + resultHtml + "</body></html>";
        res.end(html);
    }

    if (!!phrase) {
        textSearch(phrase, list => buildHtml(list));
    }
    else if (!!name) {
        nameSearch(name, list => buildHtml(list));
    }
    else {
        res.status(404);
        res.type('txt').send('Hymn not found');
    }
});

app.get('/', function (req, res) {
    res.sendFile("index.html", { root: __dirname });
});

app.get("*", function(req, res) {
    res.redirect("/");
});

app.listen(3000, function () {
    console.log('Hymn Searcher listening on port 3000!')
});