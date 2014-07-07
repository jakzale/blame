/* jslint node: true */
'use strict';

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  karma = require('gulp-karma'),
  peg = require('gulp-peg'),
  gutil = require('gulp-util'),
  tap = require('gulp-tap'),
  wrapper = require('gulp-wrapper'),
  path = require('path'),
  lint_files, test_files, paths;

paths = {
  build: 'build',
  scripts: {
    peg: 'src/**/*.peg'
  }
};


lint_files = ['./lib/blame.js', './lib/parser.js'];

test_files = ['undefined.js'];

gulp.task('test', function() {
  // Be sure to return the stream
  return gulp.src(test_files)
  .pipe(karma({
    configFile: 'karma-run.conf.js',
    action: 'run'
  }))
  .on('error', function(err) {
    // Make sure failed tests cause gulp to exit non-zero
    throw err;
  });
});

gulp.task('lint', function () {
  gulp.src(lint_files)
  .pipe(jshint())
  .pipe(jshint.reporter('default'));
});

gulp.task('test-watch', function () {
  return gulp.src(test_files)
  .pipe(karma({
    configFile: 'karma.conf.js',
    action: 'watch'
  }));
});

gulp.task('peg:compile', function () {
  return gulp.src(paths.scripts.peg).
    pipe(peg().on('error', gutil.log)).
    pipe(tap(function (file) {
      var module_name = path.basename(file.path, '.js');

      file.contents = Buffer.concat([
        new Buffer('define(\'' + module_name + '\', [], function () {\nvar module = {};\n'),
        file.contents,
        new Buffer('\n});\nreturn module.exports;')
      ]);

    })).
    pipe(gulp.dest(paths.build));
});

// vim: set ts=2 sw=2 sts=2 et :
