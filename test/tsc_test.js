/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */

// No UMD Shim for now, need to UMD-Enable TSC

define([], function () {
  describe('TypeScript', function () {
    it('should be imported', function () {
      expect(TypeScript).to.exist;
    });
  });
});


// vim: set ts=2 sw=2 sts=2 et :
