///<reference path="../../typings/date.format.js/date.format.d.ts" />
var expect = require('chai').expect;

var then = new Date(2014, 1, 1);

var thenDefaultFormat = then.format();

var thenCustom =  then.format('yyyy/m/d HH:MM');

console.log(Object.prototype.hasOwnProperty.call(then, 'format'));

expect(function () {
    var bad = then.format({});
}).to.throw();
