/*global describe, it, define, wrap, Str, Num, Bool, TFun*/

define(['blame','chai'], function(blame, chai) {
  'use strict';

   //Pollutue the global namespace with monadic types
  blame();
  var expect = chai.expect;

   //Helper for generating closures
  function closure (type, value, label) {
    return function() {
      return wrap(type, value, label);
    };
  }

  function closed (type, value, label) {
    return function() {
      var args = Array.prototype.slice.call(arguments || []);
      return function() {
        return wrap(type, value, label).apply(undefined, args);
      };
    };
  }

  describe('monadic blame', function() {
    it('should be a function', function () {
      expect(typeof blame).to.eql('function');
      expect(typeof TFun).to.eql('function');
    });

    describe('wrap', function() {
      describe('ground types', function() {
        it ('checks numbers', function() {
          // In order to check for errors, you need to pass a closure
          expect(closure(Num, 2, 'p')).not.to.throw();
          expect(wrap(Num, 2, 'p')).to.equal(2);

          expect(closure(Num, '2', 'p')).to.throw();
        });

        it ('checks strings', function() {
          expect(closure(Str, 'a', 'p')).not.to.throw();
          expect(wrap(Str, 'a', 'p')).to.eql('a');

          expect(closure(Str, 2, 'p')).to.throw();
        });

        it ('checks booleans', function() {
          expect(closure(Bool, true, 'p')).not.to.throw();
          expect(wrap(Bool, true, 'p')).to.eql(true);

          expect(closure(Bool, 2, 'p')).to.throw();
        });
      });

      describe('function types', function() {
        var Num_Num = TFun(Num, Num);

        it ('check for a function', function() {
          function empty () {}

          expect(closure(Num_Num, 1, 'p')).to.throw();
          expect(closure(Num_Num, empty, 'p')).not.to.throw();
        });

        it ('check type', function() {
          function fun (n) {return n + 1;}
          function fun2(n) {return n + '1';}

          expect(wrap(Num_Num, fun, 'p')(1)).to.equal(2);

          expect(closed(Num_Num, fun, 'p')(1)).not.to.throw();
          expect(closed(Num_Num, fun, 'p')('1')).to.throw('~p');
          expect(closed(Num_Num, fun2, 'p')(1)).to.throw('p');
          expect(closed(Num_Num, fun2, 'p')('1')).to.throw('p');
        });
      });

      describe('polymorphic types', function() {
        var forallX_X_X = Forall('X', TFun(Tyvar('X'), Tyvar('X')));
        var forallY_Y_Y = Forall('Y', TFun(Tyvar('Y'), Tyvar('Y')));
        function empty () {}
        function identity(x) {return x;}
        function stringify(x) {return new String(x);}

        it ('checks for a function', function() {
          expect(closure(forallX_X_X, empty, 'p')).not.to.throw();
          expect(closure(forallX_X_X, 2, 'p')).to.throw('p');
        });

        it ('ensures the invariants', function() {

          [1, '1', true].forEach(function(value) {
            expect(closed(forallX_X_X, identity, 'p')(value)).not.to.throw();
            expect(closed(forallX_X_X, stringify, 'p')(value)).to.throw();
          });
        });

        it ('allows to be wrapped', function() {
          // forall X -> X can be instantiated to Num -> Num
          var wrapped_identity = wrap(forallX_X_X, identity, 'p');
          //wrap(forallY_Y_Y, wrapped_identity, 'g')(1);
          expect(closed(TFun(Num, Num), wrapped_identity, 'q')(1)).not.to.throw();
          //expect(closed(forallY_Y_Y, wrapped_identity, 'g')(1)).not.to.throw();
          expect(wrap(TFun(Num, Num), wrapped_identity, 'g')(1)).to.equal(1);
        });

        it ('allows multiple same Tyvars', function() {
          var forallX_X_X_X = Forall('X', TFun(Tyvar('X'), Tyvar('X'), Tyvar('X')));
          function identity2(x, y) {return x;}
          var clos = closed(forallX_X_X_X, identity2, 'p');
          expect(clos(1, 1)).not.to.throw();
          expect(clos(1, 2)).to.throw();
        });
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
