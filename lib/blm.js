#! /usr/bin/env node

var program = require('commander');
var fs = require('fs');
var path = require('path');
var beautify = require('js-beautify').js_beautify;

program
  .version('0.0.1')
  .option('-v, --verbose', 'Print the log')
  .option('-N, --node', 'Node wrapper');


// Populating typescript
global.TypeScript = require('typescript-api');
global.LibD = require('../lib/libd.js');

//var parser = require('Blame/bin/parser');
var parser = require('../build/parser');

// Try to parse the file and print out definitions


program
  .command('print *')
  .description('print type declaration for .d.ts files')
  .action(function () {
    var args = Array.prototype.slice.apply(arguments) || [];
    var files = args.slice(0, args.length - 1);

    files.map(function (filename) {
      var target = path.resolve(process.cwd(), filename);
      var basename = path.basename(target);

      fs.readFile(target, { encoding: 'utf8' }, function (err, data) {
        if (err) {
          throw err;
        }

        var declarations = ';(function(){ var Blame = require(\'Blame\');\n' + parser.compile(basename, data, program.verbose, program.node) + '}());';

        console.log('// ------------------------');
        console.log('// node: %j', !!program.node);
        console.log('// Blame declarations for: ' + target);
        console.log(beautify(declarations, { indent_size: 2 }));
      });
    });
});

program.parse(process.argv);

// vim: set ts=2 sw=2 sts=2 et :
