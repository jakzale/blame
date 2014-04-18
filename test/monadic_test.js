/*global describe, it, define, wrap, Str, Num, Bool, Fun*/

define(['monadic','chai'], function(monadic, chai) {
  'use strict';

  // Pollutue the global namespace with monadic types
  monadic();
  var expect = chai.expect;

  // Helper for generating closures
  function closure (type, value, label) {
    return function() {
      return wrap(type, value, label);
    };
  }

  function closed (type, value, label, arg) {
    return function() {
      return wrap(type, value, label)(arg);
    };
  }

  describe('monadic blame', function() {
    it('should be a function', function () {
      expect(typeof monadic).to.eql('function');
      expect(typeof Fun).to.eql('function');
    });

    describe('wrap', function() {
      describe('ground types', function() {
        it ('checks numbers', function() {
          // In order to check for errors, you need to pass a closure
          expect(closure(Num, 2, 'p')).not.to.throw(Error);
          expect(wrap(Num, 2, 'p')).to.equal(2);

          expect(closure(Num, '2', 'p')).to.throw(Error);
        });

        it ('checks strings', function() {
          expect(closure(Str, 'a', 'p')).not.to.throw(Error);
          expect(wrap(Str, 'a', 'p')).to.eql('a');

          expect(closure(Str, 2, 'p')).to.throw(Error);
        });

        it ('checks booleans', function() {
          expect(closure(Bool, true, 'p')).not.to.throw(Error);
          expect(wrap(Bool, true, 'p')).to.eql(true);

          expect(closure(Bool, 2, 'p')).to.throw(Error);
        });
      });

      describe('function types', function() {
        it ('check for a function', function() {
          function empty () {}

          expect(closure(Fun(Num, Num), 1, 'p')).to.throw(Error);
          expect(closure(Fun(Num, Num), empty, 'p')).not.to.throw(Error);
        });

        it ('check type', function() {
          function fun (n) {return n + 1;}
          function fun2(n) {return n + '1';}

          expect(wrap(Fun(Num, Num), fun, 'p')(1)).to.equal(2);

          expect(closed(Fun(Num, Num), fun, 'p', 1)).not.to.throw(Error);
          expect(closed(Fun(Num, Num), fun, 'p', '1')).to.throw('~p');
          expect(closed(Fun(Num, Num), fun2, 'p', 1)).to.throw('p');
          expect(closed(Fun(Num, Num), fun2, 'p', '1')).to.throw('p');
        });
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
