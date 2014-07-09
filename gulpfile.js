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
  plumber = require('gulp-plumber'),
  mocha = require('gulp-mocha'),
  lint_files, test_files, paths;

paths = {
  build: 'build',
  scripts: {
    peg: 'src/**/*.pegjs'
  }
};


lint_files = ['./lib/blame.js'];

test_files = ['undefined.js'];

gulp.task('karma:run', function() {
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

gulp.task('peg:compile', function () {
  return gulp.src(paths.scripts.peg).
    pipe(plumber()).
    pipe(peg().on('error', gutil.log)).
    pipe(tap(function (file) {
      var module_name = path.basename(file.path, '.js');

      file.contents = Buffer.concat([
        new Buffer(
          '(function (factory) {\n' +
          '  \'use strict\';\n' +
          '\n' +
          '  var exported = {};\n' +
          '\n' +
          '  // Set up the exports\n' +
          '  factory(exported);\n' +
          '\n' +
          '  if (typeof define === \'function\' && define.amd) {\n' +
          '    // AMD\n' +
          '    define(\'' + module_name + '\', [], function () {\n' +
          '      return exported.exports;\n' +
          '    });\n' +
          '  } else if (typeof exports === \'object\') {\n' +
          '      module.exports = exported.exports;\n' +
          '  }\n' +
          '}(function (module) {\n' +
          '\n' +
          '// Parser Begin\n' +
          '\n'),
          file.contents,
          new Buffer(
            '// Parser End\n' +
            '}));')
      ]);
    })).
    pipe(gulp.dest(paths.build));
});

gulp.task('peg:watch', function () {
  gulp.watch([paths.scripts.peg], ['peg:compile']);
});

gulp.task('default', ['peg:compile', 'peg:watch', 'karma:watch']);

// vim: set ts=2 sw=2 sts=2 et :
