#!/usr/bin/env node

var glob = require('glob');
var program = require('commander');
var path = require('path');
var exec = require('child_process').exec;

program
.version('0.0.1')
.usage('<file ...>')
.parse(process.argv);

function unused(){ return; }

program.args.map(function (arg) {
  var ptrn = path.normalize(arg + '/**/*.d.ts'),
    i;

  glob(ptrn, function (err, files) {
    if (err) {
      throw err;
    }

    var length = files.length;
    var skip = 8;

    function parseFile(id){
      // Edge condition
      if (id >= length) {
        return;
      }

      var file = files[id];
      var command = 'blm ' + file;

      // Skip if this is infrastructure
      if (file.indexOf('_infrastructure') > -1) {
        return parseFile(id + skip);
      }

      exec(command, function (err, stdout, stderr) {
        unused(stdout, stderr);

        if (err) {
          console.log('FAIL ' + file);
        } else {
          console.log('PASS ' + file);
        }

        return parseFile(id + skip);
      });
    }

    // Start the worker pool
    for (i = 0; i < skip; i += 1) {
      parseFile(i);
    }
  });
});


// vim: set ts=2 sw=2 sts=2 et :
