/* jslint node: true */
'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    gutil = require('gulp-util');

gulp.task('lint', function () {
    gulp.src(['./lib/*.js', './test/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('test', function () {
    gulp.src(['./test/*.js'], {read: false})
        .pipe(mocha({reporter: 'nyan'}))
        .on('error', gutil.log);
});

gulp.task('watch', ['lint', 'test'], function () {
    gulp.watch(['./test/*.js', './lib/*.js'], ['lint', 'test']);
});

gulp.task('default', ['lint', 'test']);
