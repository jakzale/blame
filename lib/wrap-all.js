var fs = require('fs');
var glob = require('glob');
var path = require('path');
var exec = require('child_process').exec;

var passedEntries = fs.readFileSync('log/all', {encoding: 'utf8'});

var passed = passedEntries.split('\n').map(function (entry) {
    return entry.split(' ').pop();
}).filter(function (entry) {
    return entry.length > 0;
});

function parse(id) {
    if (id >= passed.length) {
        return;
    }

    var entry = passed[id];

    var declaration = glob.sync("typings/**/" + entry + ".d.ts").pop();

    if (!declaration) {
        declaration = glob.sync("typings/**/" + path.basename(entry, '.js') + ".d.ts").pop();
    }

    if (!declaration) {
        declaration = glob.sync("typings/" + entry + "/*.d.ts").pop();
    }

    if (!declaration) {
        if (entry === 'power-assert') {
            declaration = glob.sync("typings/assert/*.d.ts").pop();
        }
    }

    var moduleDir = 'externals/' + entry;

    console.log('*** processing: ' + entry);
    console.log('    declaration: ' + declaration);

    if (!declaration) {
        throw new Error();
    }
    // Load the package json and determine who it is
    var pack = fs.readFileSync(moduleDir + '/package.json', {encoding: 'utf8'});
    var data = JSON.parse(pack);

    var mainFile = data.main || '';
    var found = null;

    ['', 'js', '.js', '/index.js', entry + '.js'].forEach(function (ending) {
        console.log(moduleDir + '/' + mainFile + ending);
        var files = glob.sync(moduleDir + '/' + mainFile + ending);
        if (files.length === 1) {
            found = files.pop();
        }
    });

    if (entry === 'history') {
        found = 'externals/history/history.js';
    }

    console.log(found);

    found = path.normalize(found);
    console.log('    file: ' + found);

    exec('blm -N ' + declaration + ' >> ' + found, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }

        parse(id + 1);
    });
    //parse(id + 1);
}

parse(0);
