/* jslint node: true */
'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    gutil = require('gulp-util'),
    karma = require('gulp-karma');


gulp.task('lint', function () {
    gulp.src(['./lib/*.js', './test/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

//gulp.task('test', function () {
//    gulp.src(['./test/*.js'], {read: false})
//        .pipe(mocha({reporter: 'nyan'}))
//        .on('error', gutil.log);
//});

//gulp.task('watch', ['lint', 'test'], function () {
//    gulp.watch(['./test/*.js', './lib/*.js'], ['lint', 'test']);
//});

//gulp.task('watch', function () {
//    gulp.src(['lib/*.js', 'test/**/*test.js'], {read: false}).
//        pipe(karma({
//        configFile: 'karma.conf.js',
//        action: 'watch'}));
//});

gulp.task('test', function() {
    gulp.src([
        'test-main.js',
        'lib/*.js',
        'test/*.js'
    ], {read: false}).pipe(karma({
        configFile: 'karma.conf.js',
        action: 'run'
    })).on('error', function(err) {
        throw err;
    });
});

gulp.task('default', function () {
    console.log('Not implemented!');
});
