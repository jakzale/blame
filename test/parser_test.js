/*global describe, it, define, expect, PEG*/
/*jslint indent: 2, todo: true */


// UMD Shim
(function (factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['parser'], function (parser) {
      return factory(parser, expect);
    });
  } else if (typeof exports === 'object') {
    // Common JS
    module.exports = factory(require('../build/parser.js'), require('chai').expect);
  }
}(function (parser, expect) {
  'use strict';

  var unused, used;

  function empty() { return; }

  unused = empty;
  used = empty;

  used(unused);

  describe('parser module', function () {
    it('should be properly imported', function () {
      used(expect(parser).to.exist);
      used(expect(parser.parse).to.exist);
      parser.parse('');
    });

  });

  describe('parsing', function () {
    describe('white space', function () {
      it('should be ignored', function () {
        [
          'declare\tvar\tmy\t;',
          'declare\nvar\nmy\n;',
        ].forEach(function (s) {
          parser.parse(s);
        });
      });
    });

    describe('declare', function () {
      it('should be a keyword', function () {
        expect(function () {
          parser.parse('declare var declare;');
        }).to.throw();
      });

      it('should allow multiple declare statements', function () {
        parser.parse('declare var i; declare var j;');
      });
    });

    describe('identifiers', function () {
      it('it should allow strings starting with a letter, $ and _', function () {
        [
          'declare var my_var;',
          'declare var _;',
          'declare var $;',
        ].forEach(function (s) {
          parser.parse(s);
        });
      });

      it('should not allow strings starting with a number', function () {
        expect(function () {
          parser.parse('declare var 1;');
        }).to.throw();
      });
    });

    describe('variable', function () {
      it('should allow to define a single variable', function () {
        parser.parse('declare var i;');
      });

      it('should allow to define multiple variables', function () {
        parser.parse('declare var i, j;');
      });
    });

    describe('number', function () {
      it('should be a keyword', function () {
        expect(function () {
          parser.parse('declare var number;');
        }).to.throw();
      });

      it('should compile to wrapper', function () {
        var parsed = parser.parse('declare var n:number;');
        expect(parsed).to.equal('n = blame.simple_wrap(n, blame.Num);');
      });

      it('should allow to define multiple variables', function () {
        var parsed = parser.parse('declare var n:number, m:number;');
        expect(parsed).to.equal(['n = blame.simple_wrap(n, blame.Num);',
                                'm = blame.simple_wrap(m, blame.Num);'].join('\n'));
      });

      it('should allow for multiple definitions', function () {
        var parsed = parser.parse('declare var n:number; declare var m:number;');
        expect(parsed).to.equal(['n = blame.simple_wrap(n, blame.Num);',
                                'm = blame.simple_wrap(m, blame.Num);'].join('\n'));
      });
    });

    describe('boolean', function () {
      it('should be a keyword', function () {
        expect(function () {
          parser.parse('declare var boolean;');
        }).to.throw();
      });

      it('should allow to use it as a type', function () {
        var parsed = parser.parse('declare var b:boolean;');
        expect(parsed).to.equal('b = blame.simple_wrap(b, blame.Bool);');
      });
    });

    describe('string', function () {
      it('should be a keyword', function () {
        expect(function () {
          parser.parse('declare var string;');
        }).to.throw();
      });

      it('should allow to use it as a type', function () {
        var parsed = parser.parse('declare var s:string;');
        expect(parsed).to.equal('s = blame.simple_wrap(s, blame.Str);');
      });
    });

    describe('array', function () {
      it('should be a keyword', function () {
        expect(function () {
          parser.parse('declare var Array;');
        }).to.throw();
      });

      describe('Array syntax', function () {
        it('should allow for use basic types', function () {
          var parsed = parser.parse('declare var a:Array<string>;');
          expect(parsed).to.equal('a = blame.simple_wrap(a, blame.Arr(blame.Str));');
        });
      });

      describe('[] syntax', function () {
        it('should allow for basic types', function () {
          var parsed = parser.parse('declare var a:string[];');
          expect(parsed).to.equal('a = blame.simple_wrap(a, blame.Arr(blame.Str));');
        });

        it('should allow for more complex definition', function () {
          var parsed = parser.parse('declare var a:string[][];');
          expect(parsed).to.equal('a = blame.simple_wrap(a, blame.Arr(blame.Arr(blame.Str)));');
        });
      });
    });


  });
}));

// vim: set ts=2 sw=2 sts=2 et :
