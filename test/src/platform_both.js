/// <reference path="../../typings/platform/platform.d.ts" />
it('shoul pass', function () {
  var tests = {
    'Chrome Mobile 16.0.912.77 on Android 4.0.3': {
      description: "Chrome Mobile 16.0.912.77 on Android 4.0.3",
      layout: "WebKit",
      manufacturer: null,
      name: "Chrome Mobile",
      os: {
        architecture: 32,
        family: "Android",
        version: "4.0.3"
      },
      prerelease: null,
      product: null,
      ua: "Mozilla/5.0 (Linux; U; Android 4.0.3; zh-cn; HTC Sensation XE with Beats Audio Build/IML74K) AppleWebKit/535.7 (KHTML, like Gecko) CrMo/16.0.912.77 Mobile Safari/535.7",
      version: "16.0.912.77"
    },
    'WebKit Nightly 528.4 (like Safari 4.x) on Mac OS X 10.4.11': {
      description: "WebKit Nightly 528.4 (like Safari 4.x) on Mac OS X 10.4.11",
      layout: "WebKit",
      manufacturer: null,
      name: "WebKit Nightly",
      os: {
        architecture: 32,
        family: "Mac OS X",
        version: "10.4.11"
      },
      prerelease: "alpha",
      product: null,
      ua: "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_4_11; tr) AppleWebKit/528.4+ (KHTML, like Gecko) Version/4.0dp1 Safari/526.11.2",
      version: "528.4"
    }
  };

  function runTests() {
    var t;
    var p;
    var x;
    var px;
    var res;
    var onFalse;

    for (var n in tests) {
      t = tests[n];
      p = platform.parse(t.ua);

      onFalse = function (name) {
        return function () {
          throw new Error('\tfailed on prop "' + name + '" for "' + n + '"');
        };
      };

      console.log('Starting tests for: ' + n);

      falsy(function () {
        return t.description === p.description;
      }, onFalse('description'));
      falsy(function () {
        return t.layout === p.layout;
      }, onFalse('layout'));
      falsy(function () {
        return t.name === p.name;
      }, onFalse('name'));
      falsy(function () {
        return t.prerelease === p.prerelease;
      }, onFalse('prerelease'));
      falsy(function () {
        return t.ua === p.ua;
      }, onFalse('ua'));
      falsy(function () {
        return t.version === p.version;
      }, onFalse('version'));

      falsy(function () {
        return t.os.architecture === p.os.architecture;
      }, onFalse('os.architecture'));
      falsy(function () {
        return t.os.family === p.os.family;
      }, onFalse('os.family'));
      falsy(function () {
        return t.os.version === p.os.version;
      }, onFalse('os.version'));

      console.log('Finished tests for: ' + n);
    }
  }

  function falsy(condition, action) {
    if (condition() === false)
      action();
  }
// Additional tests

  var expect = require('chai').expect

  expect(function () {
    platform.parse(1);
  }).to.throw('negative');

});



