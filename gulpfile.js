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
  test_files,
  paths;

paths = {
  blame: {
    source: 'src/**/*.ts',
    build: 'build/**/*.js',
    dest: 'build'
  },
  tests: 'test/**/*_both.js'
};

gulp.task('karma:watch', function () {
  return gulp.src('undefined.js')
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});

gulp.task('tsc:compile', function () {
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


gulp.task('tsc:watch', function () {
  gulp.watch([paths.blame.source], ['tsc:compile']);
});

gulp.task('browserify:run', function() {
    var testFiles = glob.sync('./' + paths.tests);
    var bundleStream = browserify(testFiles).bundle({debug: true});

    return bundleStream
        .pipe(source('bundle-tests.js'))
        .pipe(gulp.dest('test/gen'));
});

gulp.task('browserify:watch', function () {
  gulp.watch([paths.blame.build, paths.tests], ['browserify:run']);
});


gulp.task('default', ['tsc:compile', 'browserify:run', 'karma:watch', 'tsc:watch', 'browserify:watch']);

// vim: set ts=2 sw=2 sts=2 et :
