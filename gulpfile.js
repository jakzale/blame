/*jslint node: true, indent: 2 */

'use strict';

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
  test_files,
  paths;

paths = {
  blame: {
    source: 'src/**/*.ts',
    dest: 'build'
  },
  tests: 'test/units/*_both.js',
  wrappers: 'test/src/*_both.js'
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
    var wrapperFiles = glob.sync('./' + paths.wrappers);

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


gulp.task('wrappers', function () {

  var mapper = map(function (code, filename) {
    // Split the code, then indent it, then join it together
    code = code
      .toString()
      .split(/\r\n?|\n/)
      .map(function (line) {
        if (line.trim().length > 0) {
          line = '    ' + line;
        }
        return line;
      })
      .join('\n');

      return wrapper({
        contents: code,
        filename: filename,
        declarations: ''
      });
  });

  return gulp.src('test/src/*.js')
    .pipe(mapper)
    .pipe(gulp.dest('test/wrapped'));
});

gulp.task('watch', function () {
  gulp.watch([paths.blame.source, paths.tests, paths.wrappers], ['build:bundle']);
});

// Listing the happens before relations
// to allow to run in isolation
gulp.task('build:compile', ['tsc', 'wrappers']);
gulp.task('build:bundle', ['build:compile', 'browserify']);
gulp.task('build:watch', ['build:bundle', 'watch']);

gulp.task('default', ['build:watch', 'karma']);

// vim: set ts=2 sw=2 sts=2 et :
