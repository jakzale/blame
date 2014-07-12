/*jslint node: true, indent: 2 */

'use strict';

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  karma = require('gulp-karma'),
  mocha = require('gulp-mocha'),
  tsc = require('gulp-typescript-compiler'),
  lint_files,
  test_files,
  paths;

paths = {
  build: 'build',
  scripts: {
    peg: 'src/**/*.pegjs',
    tsc: 'src/**/*.ts'
  }
};

lint_files = ['./lib/blame.js'];

test_files = ['undefined.js'];

gulp.task('karma:run', function () {
  // Be sure to return the stream
  return gulp.src(test_files)
    .pipe(karma({
      configFile: 'karma-run.conf.js',
      action: 'run'
    }))
    .on('error', function (err) {
      // Make sure failed tests cause gulp to exit non-zero
      throw err;
    });
});

gulp.task('lint', function () {
  gulp.src(lint_files)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('karma:watch', function () {
  return gulp.src(test_files)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});

gulp.task('mocha:run', function () {
  return gulp.src('test/**/*_test.js', {read: false})
    .pipe(mocha({
      reporter: 'nyan',
      bail: true
    }));
});

gulp.task('peg:watch', function () {
  gulp.watch([paths.scripts.peg], ['peg:compile']);
});

gulp.task('tsc:compile', function () {
  return gulp
    .src(paths.scripts.tsc)
    .pipe(tsc({
      module: 'amd',
      target: 'ES5',
      logErrors: true,
      sourcemap: false,
    }))
    .pipe(gulp.dest(paths.build));
});

gulp.task('tsc:watch', function () {
  gulp.watch([paths.scripts.tsc], ['tsc:compile']);
});

gulp.task('default', ['tsc:compile', 'karma:watch', 'tsc:watch']);

// vim: set ts=2 sw=2 sts=2 et :
