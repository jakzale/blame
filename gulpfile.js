/*jslint node: true, indent: 2 */

'use strict';

// Load typescript globally
global.TypeScript = require('typescript-api');
global.LibD = require('./lib/libd.js');

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  karma = require('gulp-karma'),
  mocha = require('gulp-mocha'),
  tsc = require('gulp-typescript-compiler'),
  source = require('vinyl-source-stream'),
  browserify = require('browserify'),
  glob = require('glob'),
  map = require('vinyl-map'),
  rename = require('gulp-rename'),
  rimraf = require('gulp-rimraf'),
  parser = require('./build/parser.js'),
  test_files,
  paths;



paths = {
  blame: {
    source: 'src/**/*.ts',
    dest: 'build'
  },
  tests: 'test/units/*_both.js',
  wrappers: {
    source: 'test/src/*_both.js',
    wrapped: 'test/wrapped/*_both.js'
  }
};

gulp.task('karma', function () {
  return gulp.src('undefined.js')
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});

gulp.task('tsc', function () {
  return gulp
    .src(paths.blame.source)
    .pipe(tsc({
      module: 'commonjs',
      target: 'ES5',
      logErrors: true,
      sourcemap: false,
    }))
    .pipe(gulp.dest(paths.blame.dest));
});

gulp.task('browserify', function() {
    var testFiles = glob.sync('./' + paths.tests);
    var wrapperFiles = glob.sync('./' + paths.wrappers.wrapped);

    var bundleFiles = testFiles.concat(wrapperFiles);

    var bundleStream = browserify(bundleFiles).bundle({debug: true});

    return bundleStream
        .pipe(source('bundle-tests.js'))
        .pipe(gulp.dest('test/gen'));
});

// Loading the wrapper generator
var fs = require('fs');
var handlebars = require('handlebars');

// Loading it in sync
var template = fs.readFileSync('lib/test_template.js', {encoding: 'utf8'});
var wrapper = handlebars.compile(template);

var referenceMatcher = /\/\/\/[\ \t]*<reference[\ \t]*path="(.*)"[\ \t]*\/?>/;


gulp.task('wrappers', function () {

  var mapper = map(function (code, filename) {
    var lineEnding = /\r\n?|\n/;
    // Split the code, then indent it, then join it together
    var codeLines = code.toString().split(lineEnding);

    // extract declarations
    var declFile = '';
    var blameDeclarations = '';

    // Find the first declaration
    var found = codeLines.some(function (line) {
      var match = referenceMatcher.exec(line);
      if (match) {
        declFile = match[1];

        return true;
      }
    });

    // Correcting the folder position
    declFile = declFile.replace(/^\.\.\/\.\.\//, './');

    if (found) {
      var declCode = fs.readFileSync(declFile, {encoding: 'utf8'});
      blameDeclarations = parser.compile(declFile, declCode);
    }

    function indent(length) {
      var space = (new Array(length + 1)).join(' ');
      return function(line) {
        if (line.trim().length > 0) {
          line = space + line;
        }
        return line;
      };
    }

    code = codeLines.map(indent(4)).join('\n');
    blameDeclarations = blameDeclarations.split(lineEnding).map(indent(8)).join('\n');


      // Load the declarations


      return wrapper({
        contents: code,
        filename: filename,
        declarations: blameDeclarations
      });
  });

  return gulp.src('test/src/*.js')
    .pipe(mapper)
    .pipe(gulp.dest('test/wrapped'));
});

gulp.task('watch', function () {
  gulp.watch([paths.blame.source, paths.tests, paths.wrappers.source], ['build:bundle']);
});

gulp.task('clean', function () {
  gulp.src(['build/**/*.js', 'test/wrapped/**/*.js', 'test/gen/bundle-tests.js'], {read: false})
  .pipe(rimraf());
});

// Listing the happens before relations
// to allow to run in isolation
gulp.task('build:compile', ['tsc', 'wrappers']);
gulp.task('build:bundle', ['build:compile', 'browserify']);
gulp.task('build:watch', ['build:bundle', 'watch']);

gulp.task('default', ['build:watch', 'karma']);

// vim: set ts=2 sw=2 sts=2 et :
