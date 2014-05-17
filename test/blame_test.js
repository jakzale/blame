/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  var Type = blame.Type,
    Num = blame.Num,
    Str = blame.Str,
    Bool = blame.Bool,
    Fun = blame.Fun,
    tFun = blame.tFun,
    wrap = blame.wrap,
    forall = blame.forall,
    tyvar = blame.tyvar,
    gen_label,
    values,
    types;


  gen_label = (function () {
    var counter = 0;

    return function () {
      counter += 1;

      return 'label_' + counter;
    };
  }());

  function empty() {return undefined; }

  function define(description, test) {
    return function () {
      var T = new Type(description, test);
      return T;
    };
  }

  function ground(type, value, label) {
    return function () {
      return wrap(type, value, label);
    };
  }

  values = [1, 'a', true, empty];
  types = [Num, Str, Bool, Fun];

  describe('Type creation', function () {
    it('should create a type with description', function () {

      var desc = 'Nonsense',
        definition1 = define(desc, empty),
        definition2 = define(desc, undefined);

      expect(definition1).to.not.throw();
      expect(definition2).to.throw('Test is not a function');
      expect(definition1().description).to.equal(desc);
      expect(definition1().contract).to.equal(empty);
    });
  });

  // Automatic test genration for simple values and types
  // ----------------------------------------------------
  function generate_tests(values, types) {
    var tests = [];
    values.forEach(function (value, vindex) {
      types.forEach(function (type, tindex) {
        var new_test = {
          value: value,
          type: type,
          result: (vindex === tindex)
        };
        tests.push(new_test);
      });
    });
    return tests;
  }

  describe('Ground Types', function () {
    // Run many tests for ground types:
    // Figure out how to generate this automatically
    var tests = generate_tests(values, types);

    tests.forEach(function (elem) {
      var label = gen_label(),
        test = ground(elem.type, elem.value, label),
        shld = 'should',
        desc;

      if (!elem.result) {
        shld = 'should not';
      }

      desc = '[' + elem.type.description + ']' + ' ' + shld + ' accept ' + elem.value;

      it(desc, function () {
        if (elem.result) {
          // TODO: Maybe just expect not labels
          expect(test).to.not.throw();
        } else {
          expect(test).to.throw(label);
        }
      });
    });
  });

  // Generating test cases:
  function gen_function(return_value) {
    return function () {
      return return_value;
    };
  }

  function wrapped(type, fun, label) {
    return function (arg) {
      return function () {
        var wrapped_fun = wrap(type, fun, label);
        return wrapped_fun(arg);
      };
    };
  }

  function gen_first_order(types, values) {
    var tests = [];

    types.forEach(function (domain, d_index) {
      types.forEach(function (range, r_index) {
        values.forEach(function (argument, a_index) {
          values.forEach(function (result, res_index) {
            var label = gen_label(),
              error = '',
              new_test;

            // Is return value compatible?
            if (res_index !== r_index) {
              error = label;
            }

            // Is argument value compatible?
            if (a_index !== d_index) {
              error = '~' + label;
            }

            // Create new test
            new_test = {
              domain: domain,
              range: range,
              argument: argument,
              result: result,
              label: label,
              error: error
            };

            tests.push(new_test);

          });
        });
      });
    });

    return tests;
  }

  describe('First Order Functions', function () {
    // So now I need to generate pairings of types:
    var tests = gen_first_order(types, values);

    tests.forEach(function (elem) {
      var type = tFun(elem.domain, elem.range),
        description = '[' + type.description + ']: wrapping ' + elem.argument +
          ' -> ' + elem.result + ' should ',
        fun = gen_function(elem.result),
        test = wrapped(type, fun, elem.label)(elem.argument);

      if (elem.error) {

        it(description + 'raise blame ' + elem.label, function () {
          expect(test).to.throw(elem.error);
        });
      } else {

        it(description + 'not raise blame', function () {
          expect(test).not.to.throw();
        });
      }
    });
  });

  describe('Polymorphic Functions', function () {
    it('should accept identity', function () {
      var closure,
        label = gen_label(),
        type = forall('X', tFun(tyvar('X'), tyvar('X')));

      function identity(x) { return x; }

      closure = wrapped(type, identity, label)(1);

      expect(closure).not.to.throw();

    });
  });
});

// define(['blame', 'chai'], function(blame, chai) {
//
//   var wrap = blame.wrap;
//   var Str = blame.Str;
//   var Num = blame.Num;
//   var Bool = blame.Bool;
//   var TFun = blame.TFun;
//   var Tyvar = blame.Tyvar;
//   var Forall = blame.Forall;
//
//   var expect = chai.expect;
//
//   function closure (type, value, label) {
//     return function() {
//       return wrap(type, value, label);
//     };
//   }
//
//   function closed (type, value, label) {
//     return function() {
//       var args = Array.prototype.slice.call(arguments || []);
//       return function() {
//         return wrap(type, value, label).apply(undefined, args);
//       };
//     };
//   }
//
//   var Num_Num = TFun(Num, Num);
//
//   describe('blamemorphic blame', function() {
//     describe('ground types', function() {
//       it ('wraps numbers', function() {
//         // In order to check for errors, you need to pass a closure
//         expect(closure(Num, 2, 'p')).not.to.throw();
//         expect(wrap(Num, 2, 'p')).to.equal(2);
//
//         expect(closure(Num, '2', 'p')).to.throw();
//       });
//
//       it ('wraps strings', function() {
//         expect(closure(Str, 'a', 'p')).not.to.throw();
//         expect(wrap(Str, 'a', 'p')).to.eql('a');
//
//         expect(closure(Str, 2, 'p')).to.throw();
//       });
//
//       it ('wraps booleans', function() {
//         expect(closure(Bool, true, 'p')).not.to.throw();
//         expect(wrap(Bool, true, 'p')).to.eql(true);
//
//         expect(closure(Bool, 2, 'p')).to.throw();
//       });
//     });
//
//     describe('function types', function() {
//
//       it ('check for a function', function() {
//         function empty () {}
//
//         expect(closure(Num_Num, 1, 'p')).to.throw();
//         expect(closure(Num_Num, empty, 'p')).not.to.throw();
//       });
//
//       it ('check type', function() {
//         function fun (n) {return n + 1;}
//         function fun2(n) {return n + '1';}
//
//         expect(wrap(Num_Num, fun, 'p')(1)).to.equal(2);
//
//         expect(closed(Num_Num, fun, 'p')(1)).not.to.throw();
//         expect(closed(Num_Num, fun, 'p')('1')).to.throw('~p');
//         expect(closed(Num_Num, fun2, 'p')(1)).to.throw('p');
//         expect(closed(Num_Num, fun2, 'p')('1')).to.throw('p');
//       });
//     });
//     describe('blamemorphic types', function() {
//       var forallX_X_X = Forall('X', TFun(Tyvar('X'), Tyvar('X')));
//       var forallY_Y_Y = Forall('Y', TFun(Tyvar('Y'), Tyvar('Y')));
//       function empty () {}
//       function identity(x) {return x;}
//       function stringify(x) {return String(x);}
//
//       //it ('checks for a function', function() {
//         //expect(closure(forallX_X_X, empty, 'p')).not.to.throw();
//         //expect(closure(forallX_X_X, 2, 'p')).to.throw('p');
//       //});
//
//       it ('ensures the invariants', function() {
//         [1, '2', true].forEach(function(value) {
//           expect(closed(forallX_X_X, identity, 'p' + value)(value)).not.to.throw();
//           expect(closed(forallX_X_X, stringify, 'p')(value)).to.throw();
//         });
//       });
//
//       it ('allows to be wrapped', function() {
//         // forall X -> X can be instantiated to Num -> Num
//         var wrapped_identity = wrap(forallX_X_X, identity, 'p');
//         expect(closed(TFun(Num, Num), wrapped_identity, 'q')(1)).not.to.throw();
//         expect(closed(forallY_Y_Y, wrapped_identity, 'g')(1)).not.to.throw();
//         expect(wrap(TFun(Num, Num), wrapped_identity, 'g')(1)).to.equal(1);
//
//         [1, '2', true].forEach(function(value) {
//           expect(closed(forallY_Y_Y, wrapped_identity, 'p' + value)(value)).not.to.throw();
//         });
//       });
//
//       it ('allows multiple same Tyvars', function() {
//         var forallX_X_X_X = Forall('X', TFun(Tyvar('X'), Tyvar('X'), Tyvar('X')));
//         function identity2(x, y) {return x;}
//         // Generate more test cases
//         var wrapped_identity2 = wrap(forallX_X_X_X, identity2, 'p');
//         var clos = closed(TFun(Num, Num, Num), wrapped_identity2, 'q');
//         expect(clos(1, 1)).not.to.throw();
//         expect(clos(1, 2)).to.throw();
//
//         // The invariants are preserved across the wrappers
//          var clos2 = closed(TFun(Num_Num, Num_Num, Num_Num), wrapped_identity2, 'r');
//          //clos2(identity, identity)();
//          expect(clos2(identity, identity)).not.to.throw();
//       });
//     });
//   });
// });

// vim: set ts=2 sw=2 sts=2 et :
