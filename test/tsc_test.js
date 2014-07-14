/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */

// No UMD Shim for now, need to UMD-Enable TSC

define(['parser'], function (parser) {
  describe('TypeScript', function () {
    it('should be imported', function () {
      expect(TypeScript).to.exist;

      expect(parser.version()).to.equal('0.0.1');
      //expect(parser.compileFromString('declare var i: number;')).to.equal('done!');
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

    describe('variable declaration', function () {
      it('should accept basic types', function () {
        // It could be refactored as a file with fixtures

        var source = 'declare var n:number';
        var desired = 'n = Blame.simple_wrap(n, Blame.Num);';
        expect(parser.compileFromString(source)).to.equal(desired);

        source = 'declare var b:boolean';
        desired = 'b = Blame.simple_wrap(b, Blame.Bool);';
        expect(parser.compileFromString(source)).to.equal(desired);

        source = 'declare var s:string';
        desired = 's = Blame.simple_wrap(s, Blame.Str);';
        expect(parser.compileFromString(source)).to.equal(desired);
      });

      it('should accept array types', function () {
        var source = 'declare var ns:number[]';
        var desired = 'ns = Blame.simple_wrap(ns, Blame.arr(Blame.Num));';
        expect(parser.compileFromString(source)).to.equal(desired);

        var source = 'declare var ns:Array<number>';
        expect(parser.compileFromString(source)).to.equal(desired);
      });
    });
  });
});


// vim: set ts=2 sw=2 sts=2 et :
