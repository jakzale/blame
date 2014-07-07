/* jslint node: true */
'use strict';

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  karma = require('gulp-karma'),
  lint_files, test_files;


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



// vim: set ts=2 sw=2 sts=2 et :
