/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */

// No UMD Shim for now, need to UMD-Enable TSC

define(['parser'], function (parser) {
  describe('TypeScript', function () {
    it('should be imported', function () {
      expect(TypeScript).to.exist;

      expect(parser.version()).to.equal('0.0.1');
      expect(parser.compileFromString('declare var i: number;')).to.equal('done!');
      //expect(parser.compileFromString('declare class X {};')).to.equal('done!');
    });

    it('should throw a syntactic error', function () {
      expect(function () {
        parser.compileFromString('dkajfdka');
      }).to.throw();
      expect(function () {
        parser.compileFromString('var i = 10;');
      }).to.throw();
    });


  });
});


// vim: set ts=2 sw=2 sts=2 et :
