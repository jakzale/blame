/// <reference path="../../typings/date.format.js/date.format.d.ts" />
// test dateFormat
var now = dateFormat();
var nowFullDate = dateFormat(dateFormat.masks.fullDate);

// test format() (on the prototype of Date)
var then = new Date(2014, 1, 1);
var thenDefaultFormat = then.format();
var thenCustomFormat = then.format('yyyy/m/d HH:MM');
