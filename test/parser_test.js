/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */

function empty() { return; }

var unused, used;

unused = empty;
used = empty;

define(['parser'], function (parser) {
  describe('parser module', function () {
    it('should be properly imported', function () {
      used(expect(parser).to.exist);
      used(expect(parser.parse).to.exist);
    });

  });

  describe('parsing', function () {
    describe('white space', function () {
      it('should be ignored', function () {
        [
          'declare\tvar\tmy\t;',
        ].forEach(function (s) {
          parser.parse(s);
        });
      });
    });
    describe('ambients', function () {
      it('should accept global variable declaration', function () {
        [
          'declare var my_var;',
          'declare var _;',
          'declare var $;',
        ].forEach(function (s) {
          parser.parse(s);
        });

        expect(function () {
          parser.parse('declare var 1;');
        }).to.throw();
      });
    });
  });
});


// vim: set ts=2 sw=2 sts=2 et :
