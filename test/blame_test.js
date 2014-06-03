/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  var Type = blame.Type,
    Num = blame.Num,
    Str = blame.Str,
    Bool = blame.Bool,
    Fun = blame.Fun,
    tFun = blame.tfun,
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

// vim: set ts=2 sw=2 sts=2 et :
