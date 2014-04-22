/*global describe, it, define*/

define(['poly', 'chai'], function(poly, chai) {

  var wrap = poly.wrap;
  var Str = poly.Str;
  var Num = poly.Num;
  var Bool = poly.Bool;
  var TFun = poly.TFun;
  var Tyvar = poly.Tyvar;
  var Forall = poly.Forall;

  var expect = chai.expect;

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

  var Num_Num = TFun(Num, Num);

  describe('polymorphic blame', function() {
    describe('ground types', function() {
      it ('wraps numbers', function() {
        // In order to check for errors, you need to pass a closure
        expect(closure(Num, 2, 'p')).not.to.throw();
        expect(wrap(Num, 2, 'p')).to.equal(2);

        expect(closure(Num, '2', 'p')).to.throw();
      });

      it ('wraps strings', function() {
        expect(closure(Str, 'a', 'p')).not.to.throw();
        expect(wrap(Str, 'a', 'p')).to.eql('a');

        expect(closure(Str, 2, 'p')).to.throw();
      });

      it ('wraps booleans', function() {
        expect(closure(Bool, true, 'p')).not.to.throw();
        expect(wrap(Bool, true, 'p')).to.eql(true);

        expect(closure(Bool, 2, 'p')).to.throw();
      });
    });

    describe('function types', function() {

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
      function stringify(x) {return String(x);}

      //it ('checks for a function', function() {
        //expect(closure(forallX_X_X, empty, 'p')).not.to.throw();
        //expect(closure(forallX_X_X, 2, 'p')).to.throw('p');
      //});

      it ('ensures the invariants', function() {
        [1, '2', true].forEach(function(value) {
          expect(closed(forallX_X_X, identity, 'p' + value)(value)).not.to.throw();
          expect(closed(forallX_X_X, stringify, 'p')(value)).to.throw();
        });
      });

      it ('allows to be wrapped', function() {
        // forall X -> X can be instantiated to Num -> Num
        var wrapped_identity = wrap(forallX_X_X, identity, 'p');
        expect(closed(TFun(Num, Num), wrapped_identity, 'q')(1)).not.to.throw();
        expect(closed(forallY_Y_Y, wrapped_identity, 'g')(1)).not.to.throw();
        expect(wrap(TFun(Num, Num), wrapped_identity, 'g')(1)).to.equal(1);

        [1, '2', true].forEach(function(value) {
          expect(closed(forallY_Y_Y, wrapped_identity, 'p' + value)(value)).not.to.throw();
        });
      });

      it ('allows multiple same Tyvars', function() {
        var forallX_X_X_X = Forall('X', TFun(Tyvar('X'), Tyvar('X'), Tyvar('X')));
        function identity2(x, y) {return x;}
        // Generate more test cases
        var wrapped_identity2 = wrap(forallX_X_X_X, identity2, 'p');
        var clos = closed(TFun(Num, Num, Num), wrapped_identity2, 'q');
        expect(clos(1, 1)).not.to.throw();
        expect(clos(1, 2)).to.throw();

        // The invariants are preserved across the wrappers
         var clos2 = closed(TFun(Num_Num, Num_Num, Num_Num), wrapped_identity2, 'r');
         //clos2(identity, identity)();
         expect(clos2(identity, identity)).not.to.throw();
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
