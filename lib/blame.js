/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, nomen: true */
/*

# Some technical notes for Writing Blame

*/

// TODO: This lodash loader will not work with ordinary modules, fix it later
define('blame', [], function () {
  'use strict';

  var blame = Object.create(Object.prototype);

  function unused() { return; }

  // These are functions for verifying types
  // TODO: Lodash actually accepts more complicated cases
  // TODO: Verify how this affects the results
  function is_object(obj) {
    return !!(obj && (typeof obj === 'object'));
  }

  function is_function(value) {
    return typeof value === 'function';
  }

  function is_number(value) {
    return typeof value === 'number';
  }

  function is_boolean(value) {
    return typeof value === 'boolean';
  }

  function is_string(value) {
    return typeof value === 'string';
  }

  function is_array(value) {
    return Array.isArray(value);
  }

  // Type Definition
  function Type(description, contract) {
    if (!(this instanceof Type)) {
      return new Type(description, contract);
    }

    this.description = String(description);

    if (!is_function(contract)) {
      console.log(contract);
      throw new Error('Test is not a function');
    }

    this.contract = contract;
  }

  Type.prototype.contract = function () {
    throw new Error('Empty test');
  };

  // Publish type
  blame.Type = Type;

  // Define a simple contract
  function simple_contract(test) {
    return function (value, label) {
      if (!test(value)) {
        throw new Error(label);
      }
      return value;
    };
  }

  function typedef(name, contract) {
    blame[name] = new Type(name, contract);
  }

  typedef('Num', simple_contract(is_number));
  typedef('Str', simple_contract(is_string));
  typedef('Bool', simple_contract(is_boolean));
  typedef('Fun', simple_contract(is_function));

  // Wrapping
  // ========
  function wrap(type, value, label) {
    // TODO: Consider removing this
    if (!(type instanceof Type)) {
      throw new Error('This is not a type!');
    }
    return type.contract(value, label);
  }
  blame.wrap = wrap;

  // Higher Order Contracts
  // ======================

  // Multiple function composition (Chains the contracts)
  function compose() {
    var contracts = Array.prototype.slice.call(arguments || []);

    if (contracts.length < 2) {
      throw new Error('Incorrect Number of contracts: ' + contracts.length);
    }

    return function () {
      var args = Array.prototype.slice.call(arguments || []),
        length = contracts.length,
        interim;

      while (length--) {
        interim = contracts[length].apply(this, args);
        args[0] = interim;
      }

      return args[0];
    };
  }

  // Mapper over arrays
  function map(array, f) {
    var i, result;

    // For now work only for arrays
    if (!is_array(array)) {
      throw new TypeError(array + 'is not an array');
    }

    result = [];

    for (i = 0; i < array.length; i++) {
      result[i] = f(array[i], i, array);
    }

    return result;
  }

  // Wrapping Functions
  // ------------------
  //
  // When wrapping functions, the wrapper needs to accept at least one argument, which is the return type
  // For now assume strict arguments -- the number of arguments must match.

  // Adding new type for Functions
  // TODO: Clean it up later
  function TFun(description, contract) {
    this.description = description;
    this.contract = contract;
  }

  TFun.prototype = Object.create(Type.prototype);

  blame.tFun = function () {
    // Accept multiple arguments
    var args, description, domain, range;

    args = Array.prototype.slice.call(arguments || []);

    if (args.length < 1) {
      throw new Error('Not enough arguments');
    }

    // Check if all arguments are Type and generate descriptions
    args.forEach(function (arg, index) {
      if (!(arg instanceof Type)) {
        throw new Error('argument ' + index + ' is not a Type');
      }
    });

    description = map(args, function (arg) {
      var new_description = arg.description;
      if (new_description.indexOf(' -> ') !== -1) {
        new_description = '(' + new_description + ')';
      }
      return new_description;
    }).join(' -> ');

    // Domain and range arguments
    domain = args.slice(0, -1);
    range = args[args.length - 1];

    // Proxy Wrapper
    // -------------
    // This contract generates a Proxy wrapper for the functions
    function contract(fun, label) {
      var negated, handler;

      negated = '~' + label;

      function wrap_argument(arg, index) {
        return domain[index].contract.call(undefined, arg, negated);
      }

      handler = {
        apply: function (target, thisArg, args) {
          var wrapped_args, result;

          if (args.length !== domain.length) {
            throw new Error('Wrong number of arguments: got ' + args.length +
                            ', expected ' + domain.length);
          }

          wrapped_args = map(args, wrap_argument);

          result = target.apply(thisArg, wrapped_args);

          return range.contract.call(undefined, result, label, true);
        },
        construct: function (target, args) {
          var wrapped_args = map(args, wrap_argument),
          instance = Object.create(target.prototype);

          target.apply(instance, wrapped_args);

          return range.contract.call(undefined, instance, label, true);
        }
      };

      return new Proxy(fun, handler);
    }

    return new Type(description, compose(blame.Fun.contract, contract));
  };

  // Consider allowing a type for Functions

  // An nth attempt to make those polymorphic types work
  function Forall(id, type) {
    var key, tyvar = String(id);

    if(!(type instanceof TFun)) {
      throw new TypeError(type + 'is not a TFun or Forall');
    }

    this.description = 'forall ' + id + ', ' + type.description;
    this.contract = type.contract;

    this.tyvars = {};

    if (type instanceof Forall) {
      for (key in type.tyvars) {
        if (type.tyvars.hasOwnProperty(key)) {

          // Check if not defining double foralls
          if (key === tyvar) {
            throw new TypeError('Identical type variables');
          }

          this.tyvars[key] = true;
        }
      }
    }
  }

  // Setting up the prototype chain
  Forall.prototype = Object.create(TFun.prototype);
  Forall.tyvars = {};

  function Tyvar (id) {
    this.description = String(id);
    this.contract = function(value, label, unseal) {
      unused(value, label, unseal);
    };
  }
  Tyvar.prototype = Object.create(Type.prototype);

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
