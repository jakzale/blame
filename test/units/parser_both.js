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

    describe('overloading', function () {
      it('should allow to define simple overloading', function () {
        var source = 'declare function f(): number; declare function f(b: boolean): string;';
        var desired = 'f = Blame.simple_wrap(f, Blame.union(Blame.fun([], [], null, Blame.Num), Blame.fun([Blame.Bool], [], null, Blame.Str)));';

        expect(parser.compileFromString(source)).to.equal(desired);
      });
    });

    describe('dictionaries', function () {
      it('should allow to define typeless dict', function () {
        var source = 'declare var d: { [id: string]: number };';
        var desired = 'd = Blame.simple_wrap(d, Blame.dict(Blame.Num));';

        expect(parser.compileFromString(source)).to.equal(desired);
      });
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

    it('should accept an object with optional members', function () {
      var source = 'declare var o: {b?: boolean;}';
      var desired = 'o = Blame.simple_wrap(o, Blame.obj({b: Blame.union(Blame.Bool, Blame.Null)}));';

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
    var desired = 'Color = Blame.simple_wrap(Color, Blame.hybrid(Blame.arr(Blame.Str), Blame.obj({Blue: Blame.Num, Green: Blame.Num, Red: Blame.Num})));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should ignore enum declaration with values', function () {
    var source = 'declare enum Color {Red = 1, Green = 2, Blue = 4}';
    var desired = 'Color = Blame.simple_wrap(Color, Blame.hybrid(Blame.arr(Blame.Str), Blame.obj({Blue: Blame.Num, Green: Blame.Num, Red: Blame.Num})));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});


describe('class declaration', function () {
  it('should accept a simple class declaration', function () {
    var source = 'declare class MyClass {}';
    var desired = [
      'T.set(\'MyClass\', Blame.obj({}));',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame.Any, T.get(\'MyClass\')));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a more complicated declaration', function () {
    var source = 'declare class MyClass {x: number;}';
    var desired = [
      'T.set(\'MyClass\', Blame.obj({x: Blame.Num}));',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame.Any, T.get(\'MyClass\')));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a recursive type', function () {
    var source = 'declare class MyClass {mc: MyClass;}';
    var desired = [
      'T.set(\'MyClass\', Blame.obj({mc: T.get(\'MyClass\')}));',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame.Any, T.get(\'MyClass\')));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept alternating recursive types', function () {
    var source = 'declare class A { b: B } declare class B { a: A }';
    var desired = [
      'T.set(\'A\', Blame.obj({b: T.get(\'B\')}));',
      'A = Blame.simple_wrap(A, Blame.fun([], [], null, Blame.Any, T.get(\'A\')));',
      'T.set(\'B\', Blame.obj({a: T.get(\'A\')}));',
      'B = Blame.simple_wrap(B, Blame.fun([], [], null, Blame.Any, T.get(\'B\')));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept a declaration of instance', function () {
    var source = 'declare class MyClass {} declare var c: MyClass';
    var desired = [
      'T.set(\'MyClass\', Blame.obj({}));',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame.Any, T.get(\'MyClass\')));',
      'c = Blame.simple_wrap(c, T.get(\'MyClass\'));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow for inheritance', function () {
    var source = 'declare class ParentClass {x: number} declare class MyClass extends ParentClass {b: boolean}';
    var desired = [
      'T.set(\'ParentClass\', Blame.obj({x: Blame.Num}));',
      'ParentClass = Blame.simple_wrap(ParentClass, Blame.fun([], [], null, Blame.Any, T.get(\'ParentClass\')));',
      'T.set(\'MyClass\', Blame.obj({b: Blame.Bool, x: Blame.Num}));',
      'MyClass = Blame.simple_wrap(MyClass, Blame.fun([], [], null, Blame.Any, T.get(\'MyClass\')));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('interface declaration', function () {
  it('should accept an empty interface declaration', function () {
    var source = 'interface MyInterface {}';
    var desired = [
      'T.set(\'MyInterface\', Blame.obj({}));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should accept an instance of an empty interface', function () {
    var source = 'interface MyInterface {} declare var my: MyInterface;';
    var desired = [
      'T.set(\'MyInterface\', Blame.obj({}));',
      'my = Blame.simple_wrap(my, T.get(\'MyInterface\'));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow interface inheritance', function () {
    var source = 'interface ParentInterface {b: boolean} interface ChildInterface extends ParentInterface {x: number}';
    var desired = [
      'T.set(\'ParentInterface\', Blame.obj({b: Blame.Bool}));',
      'T.set(\'ChildInterface\', Blame.obj({b: Blame.Bool, x: Blame.Num}));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});


describe('internal modules', function () {
  it('should allow to define an empty module', function () {
    // An Empty module produces no code
    var source = 'declare module MyModule {}';
    var desired = '';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow to define module with contents', function () {
    var source = 'declare module MyModule { export class MyClass { x: number; } var x:MyClass; }';
    var desired = [
      'T.set(\'MyModule.MyClass\', Blame.obj({x: Blame.Num}));',
      'MyModule = Blame.simple_wrap(MyModule, Blame.obj({MyClass: Blame.fun([], [], null, Blame.Any, T.get(\'MyModule.MyClass\')), x: T.get(\'MyModule.MyClass\')}));'
    ].join('\n');

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});


describe('routie test', function () {
  it('should work', function () {
    var source = [
      'interface Route {',
      '    constructor(path: string, name: string): Route;',
      '    addHandler(fn: Function): void;',
      '    removeHandler(fn: Function): void;',
      '    run(params: any): void;',
      '    match(path: string, params: any): boolean;',
      '    toURL(params: any): string;',
      '}',
      '',
      'declare function routie(path: string): void;',
      'declare function routie(path: string, fn: Function): void;',
      'declare function routie(routes: { [key: string]: Function }): void;'
    ].join("\n");

    // Old version
    //var desired = [
    //  'T.set(\'Route\', Blame.obj({addHandler: Blame.fun([Blame.Fun], [], null, Blame.Void), constructor: Blame.fun([Blame.Str, Blame.Str], [], null, T.get(\'Route\')), match: Blame.fun([Blame.Str, Blame.Any], [], null, Blame.Bool), removeHandler: Blame.fun([Blame.Fun], [], null, Blame.Void), run: Blame.fun([Blame.Any], [], null, Blame.Void), toURL: Blame.fun([Blame.Any], [], null, Blame.Str)}));',
    //  'routie = Blame.simple_wrap(routie, Blame.union(Blame.fun([Blame.Str], [], null, Blame.Void), Blame.fun([Blame.Str, Blame.Fun], [], null, Blame.Void), Blame.fun([Blame.dict(Blame.Fun)], [], null, Blame.Void)));'
    //].join("\n");

    var desired = [
      'T.set(\'Function\', Blame.obj({apply: Blame.fun([Blame.Any], [Blame.Any], null, null), arguments: Blame.Any, bind: Blame.fun([Blame.Any], [], Blame.Any, null), call: Blame.fun([Blame.Any], [], Blame.Any, null), caller: Blame.Any, length: Blame.Any, prototype: Blame.Any}));',
      'T.set(\'Route\', Blame.obj({addHandler: Blame.fun([T.get(\'Function\')], [], null, Blame.Void), constructor: Blame.fun([Blame.Str, Blame.Str], [], null, T.get(\'Route\')), match: Blame.fun([Blame.Str, Blame.Any], [], null, Blame.Bool), removeHandler: Blame.fun([T.get(\'Function\')], [], null, Blame.Void), run: Blame.fun([Blame.Any], [], null, Blame.Void), toURL: Blame.fun([Blame.Any], [], null, Blame.Str)}));',
      'routie = Blame.simple_wrap(routie, Blame.union(Blame.fun([Blame.Str], [], null, Blame.Void), Blame.fun([Blame.Str, T.get(\'Function\')], [], null, Blame.Void), Blame.fun([Blame.dict(T.get(\'Function\'))], [], null, Blame.Void)));'
    ].join("\n");

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('loading external types', function () {
  it('should work', function () {
    var source = 'declare var r: RegExp';
    var desired = [
      'T.set(\'RegExp\', Blame.obj({compile: Blame.fun([], [], null, null), exec: Blame.fun([Blame.Any], [], null, null), global: Blame.Any, ignoreCase: Blame.Any, lastIndex: Blame.Any, multiline: Blame.Any, source: Blame.Any, test: Blame.fun([Blame.Any], [], null, null)}));',
      'r = Blame.simple_wrap(r, T.get(\'RegExp\'));'
    ].join("\n");

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('forall types', function () {
  it('should handle simple forall types', function () {
    var source = 'declare function f<X>(x: X): X';
    var desired = 'f = Blame.simple_wrap(f, Blame.forall(\'X\', Blame.fun([Blame.tyvar(\'X\')], [], null, Blame.tyvar(\'X\'))));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should handle nested foralls', function () {
    var source = 'declare function f<X, Y>(x: X, f: (X) => Y): Y';
    var desired = 'f = Blame.simple_wrap(f, Blame.forall(\'Y\', Blame.forall(\'X\', Blame.fun([Blame.tyvar(\'X\'), Blame.fun([Blame.Any], [], null, Blame.tyvar(\'Y\'))], [], null, Blame.tyvar(\'Y\')))));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should parse objects with forall members', function () {
    var source = 'declare class C<X, Y> { x(x: X): Y; y(y: Y): X;}';
    var desired = 'T.set(\'C<X, Y>\', Blame.obj({x: Blame.fun([Blame.tyvar(\'X\')], [], null, Blame.tyvar(\'Y\')), y: Blame.fun([Blame.tyvar(\'Y\')], [], null, Blame.tyvar(\'X\'))}));\nC = Blame.simple_wrap(C, Blame.forall(\'Y\', Blame.forall(\'X\', Blame.fun([], [], null, Blame.Any, T.get(\'C<X, Y>\')))));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should allow instances with forall members', function () {
    var source = 'declare class C<X, Y> { x(x: X): Y; y(y: Y): X;} declare var c:C<number,string>;';
    var desired = 'T.set(\'C<X, Y>\', Blame.obj({x: Blame.fun([Blame.tyvar(\'X\')], [], null, Blame.tyvar(\'Y\')), y: Blame.fun([Blame.tyvar(\'Y\')], [], null, Blame.tyvar(\'X\'))}));\nC = Blame.simple_wrap(C, Blame.forall(\'Y\', Blame.forall(\'X\', Blame.fun([], [], null, Blame.Any, T.get(\'C<X, Y>\')))));\nT.set(\'C<number, string>\', Blame.obj({x: Blame.fun([Blame.Num], [], null, Blame.Str), y: Blame.fun([Blame.Str], [], null, Blame.Num)}));\nc = Blame.simple_wrap(c, T.get(\'C<number, string>\'));';

    expect(parser.compileFromString(source)).to.equal(desired);
  });
});

describe('external modules', function () {
  it('should handle a simple external module definition', function () {
    var source = 'declare module "test" { function f(): boolean; }';
    var desired = 'M["test"] = Blame.obj({f: Blame.fun([], [], null, Blame.Bool)});';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should handle export = statement', function () {
    var source = 'declare module "test" { var g: string; export = g; }';
    var desired = 'M["test"] = Blame.Str;';

    expect(parser.compileFromString(source)).to.equal(desired);
  });

  it('should parse an example external module', function () {
    var source = '';
  });
});


// vim: set ts=2 sw=2 sts=2 et :
