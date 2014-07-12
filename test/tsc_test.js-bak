/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */

// No UMD Shim for now, need to UMD-Enable TSC

define(['tsc-parser'], function (parse) {
  describe('parser module', function () {
    it('should be properly imported', function () {
      parse('');
    });
  });

  describe('parser', function () {
    it('should throw an error', function () {
      expect(function () {
        parse('var i = 1;');
      }).to.throw();
    });
  });

  describe('ambient variable declaration', function () {
    it('should accept it', function () {
      //parse('declare var i: number;');
      parse('declare var p : { x:number }');
    });

    //it('should return a type mapping', function () {
      //var parsed = parse('declare var i:number');

      //expect(parsed.i.description).to.equal('Number');
    //});
  });
});


// vim: set ts=2 sw=2 sts=2 et :
