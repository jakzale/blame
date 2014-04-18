/*global define, window */
// blame type structure

/*
 * contract is composed from the test and a label
 * type is composed from a contract and the type's name
 *
 */
define('blame', [], function () {
  'use strict';

  // TODO Change blame into a polyfill function
  function blame () {
    // Polyfilling the global object
    var e;
    for (e in blame) {
      if (blame.hasOwnProperty(e)) {
        window[e] = blame[e];
      }
    }
  }

  var Result = function(result, value) {
    if (!(this instanceof Result)) {
      return new Result(result, value);
    }

    this.result = result;
    this.value = value;

    Object.freeze(this);
  };

  var Type = function(name, contract) {
    if (!(this instanceof Type)) {
      return new Type(name, contract);
    }

    this.name = String(name);
    this.contract = contract;

    Object.freeze(this);
  };

  // Shortcut to define a type
  function typedef (identifier, contract) {
    blame[identifier] = new Type(identifier, contract);
  }

  function ground(name) {
    return function (e) {
      return (typeof e === name);
    };
  }

  function contract(test) {
    return function(value, label) {
      var result = test(value);
      if (!result) {
        throw new Error(label);
      }
      return value;
    };
  }

  typedef('Num', contract(ground('number')));
  typedef('Str', contract(ground('string')));
  typedef('Bool', contract(ground('boolean')));

  function wrap(type, value, label) {
    // In Future it should be able to parse the type
    // And generate the label
    return type.contract(value, label);
  }

  // Testing if an argument is indeed a function;
  function isFunction(func) {
    var O = {};
    return func && O.toString.call(func) === '[object Function]';
  }

  function Fun(A, B) {
    if(!(A instanceof Type)) {
      throw new TypeError('A is not a Type');
    }

    if(!(B instanceof Type)) {
      throw new TypeError('B is not a Type');
    }

    var name = A.name + ' -> ' + B.name;
    var new_contract = function(func, label) {
      var negated = '~' + label;

      if (!isFunction(func)) {
        throw new TypeError('This is not the function you are looking for');
      }
      // This will be replaced by a Proxy
      return function(e) {
        return B.contract(func(A.contract(e, negated)), label);
      };
    };

    return new Type(name, new_contract);
  }

  // Exporting
  blame.wrap = wrap;
  blame.Fun = Fun;


  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
