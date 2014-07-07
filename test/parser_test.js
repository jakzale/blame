/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

function empty() { return; }

var unused, used;

unused = empty;
used = empty;

define(['blame_parser'], function (parser) {
  describe('parser module', function () {
    it('should be properly imported', function () {
      used(expect(parser).to.exist);
    });
  });
});


// vim: set ts=2 sw=2 sts=2 et :
