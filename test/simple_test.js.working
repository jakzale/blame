/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  var Num = blame.Num,
    Str = blame.Str,
    Bool = blame.Bool,
    Fun = blame.Fun,
    tfun = blame.tfun,
    wrap = blame.wrap,
    Undefined = blame.Undefined,
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


  function ground(type, value, label) {
    return function () {
      return wrap(type, value, label);
    };
  }

  values = [1, 'a', true, empty];
  types = [Num, Str, Bool, Fun];

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
    it('should accept combinations of first order types', function (){
      var tests = gen_first_order(types, values);

      tests.forEach(function (elem) {
        var type = tfun(elem.domain, elem.range),
        fun = gen_function(elem.result),
        test = wrapped(type, fun, elem.label)(elem.argument);

        if (elem.error) {
            expect(test).to.throw(elem.error);
        } else {
            expect(test).not.to.throw();
        }
      });
    });
  });

  describe('Multiple Arity', function () {
    it ('should accept functions that return no values', function () {

      var foo = empty,
        zero = tfun(Undefined),
        one = tfun(Bool, Undefined),
        two = tfun(Bool, Num, Undefined),
        three = tfun(Bool, Num, Str, Undefined),
        label = gen_label();

      var fun_types = [zero, one, two, three];
      var good = [true, 1, 'a'];
      var bad = [1, 'a', true];

      var i, args;
      var good_cases = [];
      var bad_cases = [];

      for (i = 0; i <= good.length; i++) {
        args = good.slice(0,i);
        good_cases.push(args);
      }

      for (i = 1; i <= bad.length; i++) {
        args = bad.slice(0,i);
        bad_cases.push(args);
      }

      // Testing good cases
      good_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index], foo, label).apply(undefined, args);
        }).not.to.throw();
      });

      // Testing bad arguments
      bad_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index + 1], foo, label).apply(undefined, args);
        }).to.throw('~' + label);
      });

      // Testing bad number of arguments
      good_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index], foo, label).apply(undefined, args.concat([1]));
        }).to.throw('Wrong number of arguments');
      });
    });

    it ('should reject functions when the return value is required', function() {

      var foo = function () { return 1; },
        zero = tfun(Undefined),
        one = tfun(Bool, Undefined),
        two = tfun(Bool, Num, Undefined),
        three = tfun(Bool, Num, Str, Undefined),
        label = gen_label();

      var fun_types = [zero, one, two, three];
      var good = [true, 1, 'a'];
      var bad = [1, 'a', true];

      var i, args;
      var good_cases = [];
      var bad_cases = [];

      for (i = 0; i <= good.length; i++) {
        args = good.slice(0,i);
        good_cases.push(args);
      }

      for (i = 1; i <= bad.length; i++) {
        args = bad.slice(0,i);
        bad_cases.push(args);
      }

      // Testing good cases
      good_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index], foo, label).apply(undefined, args);
        }).to.throw(label);
      });

      // Testing bad arguments
      bad_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index + 1], foo, label).apply(undefined, args);
        }).to.throw('~' + label);
      });

      // Testing bad number of arguments
      good_cases.forEach(function (args, index) {
        expect(function () {
          wrap(fun_types[index], foo, label).apply(undefined, args.concat([1]));
        }).to.throw('Wrong number of arguments');
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
