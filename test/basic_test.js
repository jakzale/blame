
/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  // Global utils
  function empty() { return; }
  var unused = empty,
    used = empty;

  used(unused);

  describe('Blame module', function () {
    it('should be imported', function () {
      used(expect(blame).to.exist);
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
