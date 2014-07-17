/*global describe, it, define, expect, TypeScript, LibD*/
/*jslint indent: 2, todo: true */

// No UMD Shim for now, need to UMD-Enable TSC

define(['parser'], function (parser) {
  'use strict';

  function used() { return; }

  describe('TypeScript', function () {
    it('should be imported', function () {
      used(expect(TypeScript).to.exist);
      expect(parser.version()).to.equal('0.0.1');
    });

    it('should throw a syntactic error', function () {
      expect(function () {
        parser.compileFromString('dkajfdka');
      }).to.throw();
      expect(function () {
        parser.compileFromString('var i = 10;');
      }).to.throw();
    });

    it('should throw a semantic error', function () {
      expect(function () {
        parser.compileFromString('declare class MyClass {n: number} declare class MyClass {b: boolean}');
      }).to.throw();
    });
  });

  describe('TypeScript Services', function () {
    it('should be loaded', function () {
      used(expect(TypeScript.Services).to.exist);
    });
  });

  describe('Library', function () {
    it('should be loaded', function () {
      used(expect(LibD).to.exist);
    });
  });

  describe('variable declaration', function () {
    describe('basic types', function () {
      it('should accept numbers', function () {
        var source = 'declare var n:number';
        var desired = 'n = Blame.simple_wrap(n, Blame.Num);';

        expect(parser.compileFromString(source)).to.equal(desired);
      });

      it('should accept booleans', function () {
        var source = 'declare var b:boolean';
        var desired = 'b = Blame.simple_wrap(b, Blame.Bool);';

        expect(parser.compileFromString(source)).to.equal(desired);
      });

      it('should accept strings', function () {
        var source = 'declare var s:string';
        var desired = 's = Blame.simple_wrap(s, Blame.Str);';

        expect(parser.compileFromString(source)).to.equal(desired);
      });

      it('should allow for multiple definitions', function () {
        var source = 'declare var b:boolean, n:number';
        var desired = 'b = Blame.simple_wrap(b, Blame.Bool);\nn = Blame.simple_wrap(n, Blame.Num);';
        expect(parser.compileFromString(source)).to.equal(desired);
      });

    });

    describe('array types', function () {
      it('should accept array types', function () {
        var source = 'declare var ns:number[]';
        var desired = 'ns = Blame.simple_wrap(ns, Blame.arr(Blame.Num));';
        expect(parser.compileFromString(source)).to.equal(desired);

        source = 'declare var ns:Array<number>';
        expect(parser.compileFromString(source)).to.equal(desired);
      });
    });

    describe('function types', function () {
      it('should accept simple type', function () {
        var source = 'declare var f : (x: number) => number';
        var desired = 'f = Blame.simple_wrap(f, Blame.func([Blame.Num], [], null, Blame.Num));';

        expect(parser.compileFromString(source)).to.equal(desired);
      });

      //it('should accept type with optional parameters', function () {
      //  var source = 'declare var f : (x?: number) => number';
      //  var desired = 'f = Blame.simple_wrap(f, Blame.func([], [Blame.Num], null, Blame.Num));';

      //  expect(parser.compileFromString(source)).to.equal(desired);
      //});

      //it('should accept type with rest parameter', function () {
      //  var source = 'declare var f: (...rest: number[]) => number;';
      //  //var source = 'declare function f(...rest: number[]): number;';
      //  var desired = 'f = Blame.simple_wrap(f, Blame.func([], [], Blame.Num, Blame.Num));';

      //  expect(parser.compileFromString(source)).to.equal(desired);
      //});
    });


    //describe('object types', function () {
      //it('should accept simple type', function () {
        //var source = 'declare var o : {}';
        //var desired = 'o = Blame.simple_wrap(o, Blame.obj({}));';

        //expect(parser.compileFromString(source)).to.equal(desired);
      //});

      //it('should accept an object with basic member', function () {
        //var source = 'declare var o : {n: number}';
        //var desired = 'o = Blame.simple_wrap(o, Blame.obj({n: Blame.Num}));';

        //expect(parser.compileFromString(source)).to.equal(desired);
      //});

      //it('should accept an object with function member', function () {
        //var source = 'declare var o: {f: (x:number) => string}';
        //var desired = 'o = Blame.simple_wrap(o, Blame.obj({f: Blame.func([Blame.Num], [], null, Blame.Str)}));';

        //expect(parser.compileFromString(source)).to.equal(desired);
      //});
    //});
  });

  //describe('function declaration', function () {
  //  it('should accept a function declaration without type', function () {
  //    var source = 'declare function blah()';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([], [], null, null));';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a function declaration with return type', function () {
  //    var source = 'declare function blah():string';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([], [], null, Blame.Str));';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a function declaration with parameters', function () {
  //    var source = 'declare function blah(n: number)';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([Blame.Num], [], null, null));';
  //    expect(parser.compileFromString(source)).to.equal(desired);

  //    source = 'declare function blah(n: number, m: string)';
  //    desired = 'blah = Blame.simple_wrap(blah, Blame.func([Blame.Num, Blame.Str], [], null, null));';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a function declaration with parameters and return type', function () {
  //    var source = 'declare function blah(n: number, b: boolean): string';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([Blame.Num, Blame.Bool], [], null, Blame.Str));';

  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a function declaration with optional parameters', function () {
  //    var source = 'declare function blah(s?: string)';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([], [Blame.Str], null, null));';

  //    expect(parser.compileFromString(source)).to.equal(desired);

  //    source = 'declare function blah(s?: string, b?: boolean)';
  //    desired = 'blah = Blame.simple_wrap(blah, Blame.func([], [Blame.Str, Blame.Bool], null, null));';

  //    expect(parser.compileFromString(source)).to.equal(desired);

  //    source = 'declare function blah(s: string, b?: boolean)';
  //    desired = 'blah = Blame.simple_wrap(blah, Blame.func([Blame.Str], [Blame.Bool], null, null));';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a function declaration with rest parameter', function () {
  //    var source = 'declare function blah(...args: string[])';
  //    var desired = 'blah = Blame.simple_wrap(blah, Blame.func([], [], Blame.Str, null));';

  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });
  //});


  //describe('class declaration', function () {
  //  it('should accept a simple class declaration', function () {
  //    var source = 'declare class MyClass {}';
  //    var desired = '';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });

  //  it('should accept a simple class declaration', function () {
  //    var source = 'declare class MyClass { x: number }';
  //    var desired = '';
  //    expect(parser.compileFromString(source)).to.equal(desired);
  //  });
  //});

});



// vim: set ts=2 sw=2 sts=2 et :
