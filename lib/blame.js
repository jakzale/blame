/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, nomen: true */

define('blame', [], function () {
  'use strict';

  var blame = Object.create(Object.prototype);

  blame.DEBUG = true;

  function unused() { return; }
  unused(unused);

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


  function is_undefined(value) {
    return value === undefined;
  }


  // Type Definition
  function Type(description, contract) {
    if (!(this instanceof Type)) {
      return new Type(description, contract);
    }

    this.description = String(description);

    if (!is_function(contract)) {
      throw new Error(contract + ' is not a function');
    }

    this.contract = contract;
  }

  Type.prototype.contract = function () {
    throw new Error('Empty test');
  };


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
  typedef('Undefined', simple_contract(is_undefined));


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


  // Mapper over the arrays
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

  // Iterate over keys in an objects
  function each(object, f) {
    var key;

    if (!is_object(object)) {
      throw new TypeError(object + 'is not an object');
    }
    for (key in object) {
      if (object.hasOwnProperty(key)) {
        if(f(key)) {
          break;
        }
      }
    }
  }



  // Type Variable Context
  // ---------------------
  // Seals made within a given context are modeled in the following way:
  // - Tyvars - contains a set of type variables declared in the context
  // - Bindings - contains a map from to tokens to objects which contain:
  //   - the type variable they were sealed with
  //   - the value that was sealed *in* the token
  function Context(old_context) {
    var self = this;
    if (old_context && !(old_context instanceof Context)) {
      throw new TypeError(old_context + ' is not a Context');
    }

    this.tyvars = {};
    this.bindings = new WeakMap();
    this.tokens = [];

    // Inherit from old_context
    if (old_context) {
      each(old_context.tyvars, function (key) {
        self.tyvars[key] = old_context.tyvars[key];
      });

      old_context.tokens.forEach(function (token) {
        var binding = old_context.bindings.get(token);

        self.tokens.push(token);
        self.bindings.set(token, binding);
      });
    }
  }


  // Defining the function type
  // --------------------------
  function TFun() {
    var obj, args, description, domain, range;

    // Parse the arguments
    args = Array.prototype.slice.call(arguments || []);

    if (!(this instanceof TFun)) {
      obj = Object.create(TFun.prototype);
      TFun.apply(obj, args);
      return obj;
    }

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
    function contract(fun, label, context) {
      var negated, handler;

      negated = '~' + label;

      function wrap_argument(context) {
        return function (arg, index) {
          return domain[index].contract.call(undefined, arg, negated, context);
        };
      }

      handler = {
        apply: function (target, thisArg, args) {
          var wrapped_args, result, my_context;

          if (args.length !== domain.length) {
            throw new Error('Wrong number of arguments: got ' + args.length +
                            ', expected ' + domain.length);
          }

          my_context = new Context(context);
          wrapped_args = map(args, wrap_argument(my_context));
          result = target.apply(thisArg, wrapped_args);

          return range.contract.call(undefined, result, label, my_context, true);
        },
        construct: function (target, args) {
          var wrapped_args, instance, my_context;

          my_context = new Context(context);
          wrapped_args = map(args, wrap_argument(my_context));
          instance = Object.create(target.prototype);

          target.apply(instance, wrapped_args);

          return range.contract.call(undefined, instance, label, context, true);
        }
      };

      return new Proxy(fun, handler);
    }

    this.description = description;
    this.contract = compose(blame.Fun.contract, contract);
  }
  TFun.prototype = Object.create(Type.prototype);

  // TFun is exported as tfun for convenience purposes
  blame.tfun = TFun;


  function Forall(id, type) {
    if (!(this instanceof Forall)) {
      return new Forall(id, type);
    }

    var tyvar = String(id);

    if(!(type instanceof TFun)) {
      throw new TypeError(type + 'is not a TFun or Forall');
    }

    this.description = 'forall ' + id + ', ' + type.description;

    this.contract = function (value, label, context) {
      var my_context = new Context(context);

      if (my_context.tyvars[tyvar]) {
        throw new TypeError('Duplicate type variable: ' + tyvar);
      }

      // Declare a new type variable
      my_context.tyvars[tyvar] = true;

      return type.contract.call(undefined, value, label, my_context);
    };
  }
  Forall.prototype = Object.create(TFun.prototype);

  blame.forall = Forall;

  function Binding(tyvar, value) {
    this.tyvar = tyvar;
    this.value = value;
  }
  Binding.prototype.tyvar = '';
  Binding.prototype.value = null;


  // Token
  // -----
  // Replaces the sealed value
  function Token(tyvar) {
    this.tyvar = tyvar;
  }
  Token.prototype.tyvar = '';


  // Preventing all object like operations on tokens
  function token(tyvar, label) {
    var handler = {}, t = new Token(tyvar);

    function panic() {
      throw new TypeError(label + ', Accessing properties of token ' + token.tyvar);
    }

    if (!blame.DEBUG) {
      [
        'getOwnPropertyDescriptor',
        'getOwnPropertyNames',
        'defineProperty',
        'deleteProperty',
        'freeze',
        'seal',
        'preventExtensions',
        'has',
        'hasOwn',
        'get',
        'set',
        'enumerate',
        'iterate',
        'keys',
        'apply',
        'construct'
      ].forEach(function (e) {
        handler[e] = panic;
      });
    }

    return new Proxy(t, handler);
  }


  function is_unsealed(value) {
    return !(value instanceof Token);
  }


  // Sealing function
  // ----------------
  // Sealing the value inside a token by using the method of storing private
  // properties of an object using a WeakMap.
  //
  // References:
  // * https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Contributor_s_Guide/Private_Properties#Using_WeakMaps
  // * http://fitzgeraldnick.com/weblog/53/
  function seal(value, tyvar, label, context) {
    if (!(context instanceof Context)) {
      throw new TypeError(context + ' is not a Context');
    }

    // TODO: Verify what to throw
    if (!context.tyvars[tyvar]) {
      throw new TypeError(tyvar + ' is not defined,' + label);
    }

    // TODO: Unsure if the label is proper here
    var my_token = token(tyvar, label),
      binding = new Binding(tyvar, value);

    context.bindings.set(my_token, binding);
    context.tokens.push(my_token);

    return my_token;
  }


  // Unsealing function
  // ------------------
  function unseal(token, tyvar, label, context) {
    if (is_unsealed(token)) {
      throw new TypeError (label + ', not a token sealed by ' + tyvar);
    }

    if (!context.bindings.has(token)) {
      throw new TypeError (label + ', token sealed by a different forall');
    }

    var binding = context.bindings.get(token);

    if (binding.tyvar !== tyvar) {
      throw new TypeError (label + ', wrong seal, ' + binding.tyvar + ' instead of ' + tyvar);
    }

    return binding.value;
  }


  function Tyvar(id) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(id);
    }

    var tyvar = String(id);
    this.description = tyvar;
    this.contract = function(value, label, context, is_unseal) {
      if (is_unseal) {
        // This corresponds to the *:X cast
        return unseal(value, tyvar, label, context);
      }

      // This corresponds to the X:* cast
      return seal(value, tyvar, label, context);
    };
  }
  Tyvar.prototype = Object.create(Type.prototype);

  blame.tyvar = Tyvar;

  // Definition of a simple array
  typedef('Arr', simple_contract(is_array));

  // Array wrapper for blame
  function TArr(type) {
    if (!(this instanceof TArr)) {
      return new TArr(type);
    }

    if (!(type instanceof Type)) {
      throw new TypeError (type + ' is not a type');
    }

    this.description = '[' + type.description + ']';

    function contract(value) {
      return new Proxy(value, {});
    }

    this.contract = compose(blame.Arr.contract, contract);
  }

  TArr.prototype = Object.create(Type.prototype);

  blame.tarr = TArr;

  return blame;
});



// vim: set ts=2 sw=2 sts=2 et :
