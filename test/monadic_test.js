/*global describe, it, define */

define(['monadic','chai'], function(monadic, chai) {
  'use strict';

  var expect = chai.expect;
  describe('monadic blame', function() {
    it('should be a function', function () {
      expect(typeof monadic === 'function').to.eql(true);
    });
  });
});



// vim: set ts=2 sw=2 sts=2 et :
