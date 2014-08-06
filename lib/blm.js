#! /usr/bin/env node

var program = require('commander');
var fs = require('fs');
var path = require('path');
var beautify = require('js-beautify').js_beautify;

program
  .version('0.0.1')
  .usage('[options] <file ...>')
  .option('-v, --verbose', 'Print the log')
  .parse(process.argv);

// Populating typescript
global.TypeScript = require('typescript-api');
global.LibD = require('../lib/libd.js');

//var parser = require('Blame/bin/parser');
var parser = require('../build/parser');

// Try to parse the file and print out definitions


program.args.map(function (filename) {
  var target = path.resolve(process.cwd(), filename);
  var basename = path.basename(target);

  // Try to load a value from the file
  var contents = fs.readFileSync(target, {encoding: 'utf8'});

  console.log('Blame declarations for: ' + target);
  var declarations = parser.compile(basename, contents, program.verbose);

  console.log(beautify(declarations, { indent_size: 2 }));
});
// vim: set ts=2 sw=2 sts=2 et :
