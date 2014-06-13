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
    var test = !!(value && (typeof value === 'function'));
    return test;
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
  function Context(is_last, old_context) {
    if (!(this instanceof Context)) {
      return new Context(old_context);
    }

    var self = this;
    if (old_context && !(old_context instanceof Context)) {
      throw new TypeError(old_context + ' is not a Context');
    }

    this.tyvars = {};
    //this.bindings = new WeakMap();
    this.is_last = is_last;

    // Inherit from old_context
    if (old_context) {
      each(old_context.tyvars, function (key) {
        self.tyvars[key] = old_context.tyvars[key];
      });

      if (!old_context.is_last) {
        this.is_last = !is_last;
      }
    }

    this.increase = function () {
      var key;

      for (key in this.tyvars) {
        if (this.tyvars.hasOwnProperty(key)) {
          this.tyvars[key] = this.tyvars[key] + 1;
        }
      }
    };
  }

  // Increase the tyvars depth;

  function SealStorage(old_seal_storage) {
    if (!(this instanceof SealStorage)) {
      return new SealStorage(old_seal_storage);
    }

    var self = this;

    if (old_seal_storage) {
      each(old_seal_storage, function (key) {
        self[key] = old_seal_storage[key];
      });
    }
  }

  //SealStorage.prototype = null;


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
    function contract(fun, label, context, seals) {
      var negated, handler, my_context, arg_context;

      my_context = new Context(true, context);
      my_context.increase();

      arg_context = new Context(false, context);
      arg_context.increase();

      negated = '~' + label;

        function wrap_argument(arg, index) {
          return domain[index].contract.call(undefined, arg, negated, arg_context, seals);
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

          return range.contract.call(undefined, result, label, my_context, seals);
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


  function Seal(id) {
    if (!(this instanceof Seal)) {
      return new Seal(id);
    }

    var tyvar = String(id);
    var storage = new WeakMap();

    this.seal = function (value, label) {
      var my_token = token(tyvar, label);

      storage.set(my_token, value);

      return my_token;
    };

    this.unseal = function (token, label) {
      if (is_unsealed(token)) {
        throw new TypeError(label + ', ' + token + '  not a token! ' + tyvar);
      }

      if (!storage.has(token)) {
        throw new TypeError(label + ' token, wrong seal, not ' + tyvar);
      }

      return storage.get(token);
    };
  }
  function Forall(id, type) {
    if (!(this instanceof Forall)) {
      return new Forall(id, type);
    }

    var tyvar = String(id);

    if(!(type instanceof TFun)) {
      throw new TypeError(type + ' is not a TFun or Forall, ' + tyvar);
    }

    this.description = 'forall ' + id + ', ' + type.description;

    this.contract = function (value, label, context, seals) {
      var my_context = new Context(true, context);

      if (my_context.tyvars[tyvar]) {
        throw new TypeError('Duplicate type variable: ' + tyvar);
      }

      // Declare a new type variable
      my_context.tyvars[tyvar] = 2;

      var handler = {
        apply: function (target, thisArg, args) {
          // TODO: Here generate the seal storage
            var wrapped_fun,
            my_seals = new SealStorage(seals);
            my_seals[tyvar] = new Seal(tyvar);

            wrapped_fun = type.contract.call(undefined, target, label, my_context, my_seals);

          return wrapped_fun.apply(thisArg, args);
        }
        // TODO: Figure how to do construct
      };

      //return type.contract.call(undefined, value, label, my_context, true);
      return new Proxy(value, handler);
    };
  }
  Forall.prototype = Object.create(TFun.prototype);

  blame.forall = Forall;

  function Tyvar(id) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(id);
    }

    var tyvar = String(id);
    this.description = tyvar;
    this.contract = function(value, label, context, seals) {
      var unseal = context.is_last;

      if (!(context.tyvars[tyvar])) {
        throw new TypeError(tyvar + ' is not defined!');
      }

      // Calculating the cast
      //console.log(tyvar, context.tyvars[tyvar]);

      //console.log(tyvar, context.tyvars[tyvar], unseal, value);
      //if (((context.tyvars[tyvar]) % 2) === 1) {
        //unseal = !unseal;
      //}

      if (unseal) {
        // This corresponds to the *:X cast
        return seals[tyvar].unseal(value, label);
      }

      // This corresponds to the X:* cast
      return seals[tyvar].seal(value, label);
    };
  }
  Tyvar.prototype = Object.create(Type.prototype);

  blame.tyvar = Tyvar;

  // Definition of a simple array
  typedef('Arr', simple_contract(is_array));

  function toUint32(value) {
    return (Number(value) >>> 0);
  }

  var ARRAY_API = {
    // Property
    length: blame.Num,

    // Mutator methods
    fill: false,
    pop: false,
    push: false,
    reverse: false,
    shift: false,
    sort: false,
    splice: false,
    unshift: false,

    // Accessor methods
    concat: false,
    join: false,
    slice: false,
    toString: false,
    toLocaleString: false,
    indexOf: false,
    lastIndexOf: false
  };

  // Array wrapper for blame
  function TArr(type) {
    if (!(this instanceof TArr)) {
      return new TArr(type);
    }

    if (!(type instanceof Type)) {
      throw new TypeError (type + ' is not a type');
    }

    this.description = '[' + type.description + ']';

    function contract(value, label, context, seals) {
      // TODO: Verify if unseal makes any difference for now

      var handler = {
        // Getter
        get: function (target, name, receiver) {
          var index,
            get_context = new Context(true, context);
            get_context.increase();

          unused(receiver);

          // Is it an index, as defined by ECMA 5, $15.4,
          // http://www.ecma-international.org/ecma-262/5.1/#sec-15.4

          // Calculating ToString(ToUint32(name))
          // Hack to convert to ToUint32
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Polyfill
          index = toUint32(name);

          if (name === index.toString() && index !== (-1 >>> 0)) {

            return type.contract(target[name], label, get_context, seals);

          }

          if (ARRAY_API.hasOwnProperty(name)) {
            if (ARRAY_API[name]) {
              return ARRAY_API[name].contract(target[name], label, get_context, seals);
            }

            throw new Error('Array API method ' + name + ' not yet implemented');
          }

          throw new TypeError('~' + label + ', wrong property ' + name + ' of an array');
        },
        // Setter
        set: function (target, name, value, receiver) {
          var index, negated,
            set_context = new Context(false, context);
            set_context.increase();

          unused(receiver);

          index = toUint32(name);

          if (name === index.toString() && index !== (-1 >>> 0)) {
            // If Object is sealed do nothing
            if (Object.isFrozen(target)) {
              return false;
            }

            if (Object.isSealed(target) && (index >= target.length)) {
              return false;
            }
            negated = '~' + label;

            target[name] = type.contract(value, negated, set_context, seals);
          }
        }

      };
      return new Proxy(value, handler);
    }

    this.contract = compose(blame.Arr.contract, contract);
  }

  TArr.prototype = Object.create(Type.prototype);

  blame.tarr = TArr;

  return blame;
});



// vim: set ts=2 sw=2 sts=2 et :
