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

  function closed (type, value, label, arg) {
    return function() {
      return wrap(type, value, label)(arg);
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

          expect(closure(TFun(Num, Num), 1, 'p')).to.throw(Error);
          expect(closure(TFun(Num, Num), empty, 'p')).not.to.throw(Error);
        });

        it ('check type', function() {
          function fun (n) {return n + 1;}
          function fun2(n) {return n + '1';}

          expect(wrap(TFun(Num, Num), fun, 'p')(1)).to.equal(2);

          expect(closed(TFun(Num, Num), fun, 'p', 1)).not.to.throw(Error);
          expect(closed(TFun(Num, Num), fun, 'p', '1')).to.throw('~p');
          expect(closed(TFun(Num, Num), fun2, 'p', 1)).to.throw('p');
          expect(closed(TFun(Num, Num), fun2, 'p', '1')).to.throw('p');
        });
      });

      describe('polymorphic types', function() {
        it ('checks for a function', function() {
          function empty () {}

          expect(closure(TForall('X'), empty, 'p')).not.to.throw(Error);
          expect(closure(TForall('X'), 2, 'p')).to.throw('p');
        });

        it ('ensures the invariants', function() {
          function identity(x) {return x;}
          function stringify(x) {return String(x);}
          expect(closed(TForall('X'), identity, 'p', 1)).not.to.throw(Error);
          expect(closed(TForall('X'), stringify, 'p', 1)).to.throw(Error);
        });

        it ('allows to be wrapped', function() {
          function identity(x) {return x;}
          // forall X -> X can be instantiated to Num -> Num
          expect(closed(TFun(Num, Num), wrap(TForall('X'), identity, 'p'), 'q',
                        1)).not.to.throw(Error);

          expect(wrap(TFun(Num, Num), wrap(TForall('X'), identity, 'p'),
                      'g')(1)).to.equal(1);
        });
      });

      describe('new polymorphic types', function() {
        it ('checks for a function', function() {
          function empty () {}

          expect(closure(Forall('X', TFun(Tyvar('X'), Tyvar('X'))), empty,
                         'p')).not.to.throw(Error);
          expect(closure(Forall('X', TFun(Tyvar('X'), Tyvar('X'))), 2,
                         'p')).to.throw('p');
        });

        it ('ensures the invariants', function() {
          function identity(x) {return x;}
          function stringify(x) {return String(x);}

          expect(closed(Forall('X', TFun(Tyvar('X'), Tyvar('X'))), identity,
                        'p', 1)).not.to.throw(Error);
          expect(closed(Forall('X', TFun(Tyvar('X'), Tyvar('X'))), stringify,
                        'p', 1)).to.throw(Error);
        });

        it ('allows to be wrapped', function() {
          function identity(x) {return x;}
          // forall X -> X can be instantiated to Num -> Num
          expect(closed(TFun(Num, Num), wrap(Forall('X', TFun(Tyvar('X'),
                                                              Tyvar('X'))),
                                                              identity, 'p'),
                                                              'q',
                                                              1)).not.to.throw(Error);

          expect(wrap(TFun(Num, Num), wrap(Forall('X', TFun(Tyvar('X'),
                                                            Tyvar('X'))),
                                                            identity, 'p'),
                                                            'g')(1)).to.equal(1);
        });
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
