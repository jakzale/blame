/*global define, window */
// blame type structure

/*
 * contract is composed from the test and a label
 * type is composed from a contract and the type's name
 *
 * Notes:
 *  * Think about combining contracts, it could be reused to provide a form of subtyping
 *  * A cast from * to Num -> Num should be split into two casts, * => * -> * => Num -> Num,
 *    recall what blame mentions about it in the publications.
 *  * Figure out if representing sub types is needed, and how it should be done.
 *    - For example, you could represent a type as a partial order, and a set of contracts,
 *      and then just test those contracts in bulk (although this is probably not needed)
 *  * Once you lay down the foundation you should start writing a parser for type definitions,
 *    and start testing some type performance
 *
 *  * Add some **polymorphic** types
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

  // A simple first order contract
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

  // Compose two contracts
  function compose(f, g) {
    return function(value, label) {
      return g(f(value, label), label);
    };
  }

  // * => *
  typedef('Fun', contract(isFunction));

  function TFun(A, B) {
    if(!(A instanceof Type)) {
      throw new TypeError('A is not a Type');
    }

    if(!(B instanceof Type)) {
      throw new TypeError('B is not a Type');
    }

    var name = A.name + ' -> ' + B.name;
    // Not sure if I should perform composition on whole types, not just contracts
    var new_contract = compose(blame.Fun.contract, function(func, label) {
      var negated = '~' + label;

      // This will be replaced by a Proxy
      return function(e) {
        return B.contract(func(A.contract(e, negated)), label);
      };
    });

    return new Type(name, new_contract);
  }

  // Adding polymorphic types
  // Forall('X', Fun(Tyvar('X'), Tyvar('X')))

  // Example of a dynamically sealed function:
  function deepFreeze (o) {
    var prop, propKey;
    Object.freeze(o); // First freeze the object.

    for (propKey in o) {
      if (Object.hasOwnProperty.call(o, propKey)) {
        prop = o[propKey];
        if (typeof prop === "object" && !Object.isFrozen(prop)) {
          deepFreeze(prop);
        }
      }
    }
  }

  // Can a function forall('X', 'X -> X') be cast to 'Num -> Num'
  // It is more concerning about types...

  // I need to get a pair of functions, one for sealing and one for unsealing

  function polymorphic (func, label) {
    // How can I possibly make the function completely secure?
    return (function () {
      var token = Object.create(null);
      Object.freeze(token);
      var keep;

      // Sealing function
      var seal = function (x) {
        keep = x;
        return token;
      };

      // Unsealing function
      var unseal = function (x) {
        if (x === token) {
          return keep;
        }
        throw new Error(label);
      };

      return function(x) {
        return unseal(func(seal(x)));
      };
    }());
  }

  // Forall just ignore the argument
  // How can I make the type definition?
  function TForall(X) {
    var name = 'forall ' + X + ', ' + X + ' -> ' + X;
    return new Type(name, polymorphic);
  }

  // Exporting
  blame.wrap = wrap;
  blame.TFun = TFun;
  blame.TForall = TForall;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
