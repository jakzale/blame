/*global describe, it, define, expect, TypeScript */
/*jslint indent: 2, todo: true */
'use strict';

var expect = require('chai').expect,
  parser = require('../../build/parser.js');

function used() { return; }

describe('TypeScript', function () {
  it('should be imported', function () {
    used(expect(TypeScript).to.exist);
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

  // TODO: Remember about this
/*
 *  describe('array types', function () {
 *    it('should accept array types', function () {
 *      var source = 'declare var ns:number[]';
 *      var desired = 'ns = Blame.simple_wrap(ns, Blame.arr(Blame.Num));';
 *      expect(parser.compileFromString(source)).to.equal(desired);
 *
 *      source = 'declare var ns:Array<number>';
 *      expect(parser.compileFromString(source)).to.equal(desired);
 *    });
 *  });
 */

  describe('function types', function () {
    it('should accept simple type', function () {
      var source = 'declare var f : (x: number) => number';
      var desired = 'f = Blame.simple_wrap(f, Blame.fun([Blame.Num], [], null, Blame.Num));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept type with optional parameters', function () {
      var source = 'declare var f : (x?: number) => number';
      var desired = 'f = Blame.simple_wrap(f, Blame.fun([], [Blame.Num], null, Blame.Num));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept type with rest parameter', function () {
      var source = 'declare var f: (...rest: number[]) => number;';
      var desired = 'f = Blame.simple_wrap(f, Blame.fun([], [], Blame.Num, Blame.Num));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept a function with no return type', function () {
      var source = 'declare var f: () => void';
      var desired = 'f = Blame.simple_wrap(f, Blame.fun([], [], null, Blame.Void));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });
  });


  describe('object types', function () {
    it('should accept simple type', function () {
      var source = 'declare var o : {}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({}));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept an object with basic member', function () {
      var source = 'declare var o : {n: number}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({n: Blame.Num}));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept an object with function member', function () {
      var source = 'declare var o: {f: (x:number) => string}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({f: Blame.fun([Blame.Num], [], null, Blame.Str)}));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept an object with an object member', function () {
      var source = 'declare var o : {o: {}}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({o: Blame.obj({})}));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });

    it('should accept an object with multiple members', function () {
      var source = 'declare var o: {b: boolean; s: string}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({b: Blame.Bool, s: Blame.Str}));';

      expect(parser.compileFromString(source)).to.equal(desired);
    });
  });
});

describe('function declaration', function () {
  it('should accept a function declaration without type', function () {
    var source = 'declare function blah()';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([], [], null, Blame.Any));';
    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a function declaration with return type', function () {
    var source = 'declare function blah():string';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([], [], null, Blame.Str));';
    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a function declaration with parameters', function () {
    var source = 'declare function blah(n: number)';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([Blame.Num], [], null, Blame.Any));';
    expect(parser.compileFromString(source)).to.equal(desired);

    source = 'declare function blah(n: number, m: string)';
    desired = 'blah = Blame.simple_wrap(blah, Blame.fun([Blame.Num, Blame.Str], [], null, Blame.Any));';
    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a function declaration with parameters and return type', function () {
    var source = 'declare function blah(n: number, b: boolean): string';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([Blame.Num, Blame.Bool], [], null, Blame.Str));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a function declaration with optional parameters', function () {
    var source = 'declare function blah(s?: string)';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([], [Blame.Str], null, Blame.Any));';

    expect(parser.compileFromString(source)).to.equal(desired);

    source = 'declare function blah(s?: string, b?: boolean)';
    desired = 'blah = Blame.simple_wrap(blah, Blame.fun([], [Blame.Str, Blame.Bool], null, Blame.Any));';

    expect(parser.compileFromString(source)).to.equal(desired);

    source = 'declare function blah(s: string, b?: boolean)';
    desired = 'blah = Blame.simple_wrap(blah, Blame.fun([Blame.Str], [Blame.Bool], null, Blame.Any));';
    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a function declaration with rest parameter', function () {
    var source = 'declare function blah(...args: string[])';
    var desired = 'blah = Blame.simple_wrap(blah, Blame.fun([], [], Blame.Str, Blame.Any));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('enum declaration', function () {
  it('should ignore enum declaration', function () {
    var source = 'declare enum Color {Red, Green, Blue}';
    var desired = 'Color = Blame.simple_wrap(Color, Blame.obj({}));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should ignore enum declaration with values', function () {
    var source = 'declare enum Color {Red = 1, Green = 2, Blue = 4}';
    var desired = 'Color = Blame.simple_wrap(Color, Blame.obj({}));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});


describe('class declaration', function () {
  it('should accept a simple class declaration', function () {
    var source = 'declare class MyClass {}';
    var desired = [
      'var Blame_MyClass;',
      'Blame_MyClass = Blame.obj({});',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame_MyClass));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a more complicated declaration', function () {
    var source = 'declare class MyClass {x: number;}';
    var desired = [
      'var Blame_MyClass;',
      'Blame_MyClass = Blame.obj({x: Blame.Num});',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame_MyClass));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a recursive type', function () {
    var source = 'declare class MyClass {mc: MyClass;}';
    var desired = [
      'var Blame_MyClass;',
      'Blame_MyClass = Blame.obj({mc: Blame_MyClass});',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame_MyClass));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept alternating recursive types', function () {
    var source = 'declare class A { b: B } declare class B { a: A }';
    var desired = [
      'var Blame_A, Blame_B;',
      'Blame_A = Blame.obj({b: Blame_B});',
      'A = Blame.simple_wrap(A, Blame.fun([], [], null, Blame_A));',
      'Blame_B = Blame.obj({a: Blame_A});',
      'B = Blame.simple_wrap(B, Blame.fun([], [], null, Blame_B));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a declaration of instance', function () {
    var source = 'declare class MyClass {} declare var c: MyClass';
    var desired = [
      'var Blame_MyClass;',
      'Blame_MyClass = Blame.obj({});',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame_MyClass));',
      'c = Blame.simple_wrap(c, Blame_MyClass);'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow for inheritance', function () {
    var source = 'declare class ParentClass {x: number} declare class MyClass extends ParentClass {b: boolean}';
    var desired = [
      'var Blame_MyClass, Blame_ParentClass;',
      'Blame_ParentClass = Blame.obj({x: Blame.Num});',
      'ParentClass = Blame.simple_wrap(ParentClass, Blame.fun([], [], null, Blame_ParentClass));',
      'Blame_MyClass = Blame.obj({b: Blame.Bool, x: Blame.Num});',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame_MyClass));',
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('interface declaration', function () {
  it('should accept an empty interface declaration', function () {
    var source = 'interface MyInterface {}';
    var desired = [
      'var Blame_MyInterface;',
      'Blame_MyInterface = Blame.obj({});'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept an instance of an empty interface', function () {
    var source = 'interface MyInterface {} declare var my: MyInterface;';
    var desired = [
      'var Blame_MyInterface;',
      'Blame_MyInterface = Blame.obj({});',
      'my = Blame.simple_wrap(my, Blame_MyInterface);'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow interface inheritance', function () {
    var source = 'interface ParentInterface {b: boolean} interface ChildInterface extends ParentInterface {x: number}';
    var desired = [
      'var Blame_ChildInterface, Blame_ParentInterface;',
      'Blame_ParentInterface = Blame.obj({b: Blame.Bool});',
      'Blame_ChildInterface = Blame.obj({b: Blame.Bool, x: Blame.Num});'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

/*
 *describe('internal modules', function () {
 *  it('should allow to define an empty module', function () {
 *    // An Empty module produces no code
 *    var source = 'declare module MyModule {}';
 *    var desired = '';
 *
 *    expect(parser.compileFromString(source)).to.equal(desired);
 *  });
 *
 *  //it('should allow to define module with contents', function () {
 *    //var source = 'declare module MyModule { export class MyClass { x: number; } }';
 *    //var desired = 'MyModule = Blame.simple_wrap(MyModule, Blame.obj({}));';
 *
 *    //parser.compileFromString(source, true);
 *    ////expect(parser.compileFromString(source, true)).to.equal(desired);
 *  //});
 *});
 */



// vim: set ts=2 sw=2 sts=2 et :
