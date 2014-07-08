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

      it('should allow to use Array syntax', function () {
        var parsed = parser.parse('declare var a:Array<string>;');
        expect(parsed).to.equal('a = blame.simple_wrap(a, blame.Arr(blame.Str));');
      });
    });


  });
});


// vim: set ts=2 sw=2 sts=2 et :
