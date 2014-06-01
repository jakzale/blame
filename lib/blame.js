/*global define, window, WeakMap, console */
/*jslint indent: 2, todo: true, nomen: true */
/*

# Some technical notes for Writing Blame

*/

// TODO: This lodash loader will not work with ordinary modules, fix it later
define('blame', ['lodash'], function (_) {
  'use strict';

  var blame = Object.create(Object.prototype),
    forall_contexts = new WeakMap(),
    type_variables = new WeakMap(),
    panic_handler;

  function is_object(obj) {
    return obj && (typeof obj === 'object');
  }

  function unused() { return; }

  // Type Definition
  function Type(description, contract) {
    if (!(this instanceof Type)) {
      return new Type(description, contract);
    }

    this.description = String(description);

    if (!_.isFunction(contract)) {
      throw new Error('Test is not a function');
    }
    this.contract = contract;
  }

  Type.prototype.contract = function () {
    throw new Error('Empty test');
  };

  // Publish type
  blame.Type = Type;

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

  typedef('Num', simple_contract(_.isNumber));
  typedef('Str', simple_contract(_.isString));
  typedef('Bool', simple_contract(_.isBoolean));
  typedef('Fun', simple_contract(_.isFunction));

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

  function wrap_arguments(args, domain, label, thisArg) {
    var wrapped_arguments = [];
    args.forEach(function (arg, index) {
      if (index < domain.length) {
        wrapped_arguments.push(domain[index].contract.call(thisArg, arg, label, false));
      } else {
        wrapped_arguments.push(arg);
      }
    });

    return wrapped_arguments;
  }


  // Wrapping Functions
  // ------------------
  //
  // When wrapping functions, the wrapper needs to accept at least one argument, which is the return type
  // For now assume strict arguments -- the number of arguments must match.

  blame.tFun = function () {
    // Accept multiple arguments
    var args = Array.prototype.slice.call(arguments || []),
      description,
      domain,
      range;

    if (args.length < 1) {
      throw new Error('Not enough arguments');
    }

    // Check if all arguments are Type and generate descriptions
    _.every(args, function (arg, index) {
      if (!(arg instanceof Type)) {
        throw new Error('argument ' + index + ' is not a Type');
      }
    });

    description = _.map(args, function (arg, index) {
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
      var negated = '~' + label,
        that = this,
        handler = {
          apply: function (target, thisArg, args) {
            var wrapped_args, result;
            // TODO: Generate a new instance of a type with seals attached to it.

            // TODO: Consider calling recursively wrap.
            if (args.length !== domain.length) {
              throw new Error('Wrong number of arguments: got ' + args.length +
                              ', expected ' + domain.length);
            }

            wrapped_args = wrap_arguments(args, domain, negated, that);
            result = target.apply(thisArg, wrapped_args);

            return range.contract.call(that, result, label, true);
          },
          // TODO: Not entirely sure if this is correct.
          construct: function (target, args) {
            var wrapped_args = wrap_arguments(args, domain, negated, that),
              instance = Object.create(target.prototype);

            target.apply(instance, wrapped_args);

            return range.contract.call(that, instance, label, true);
          }
        };

      return new Proxy(fun, handler);
    }

    return new Type(description, compose(blame.Fun.contract, contract));
  };

  // Polymorhic Proxy Wrapper
  // ------------------------
  // Generate a polymorphic proxy wrapper
  // Nested foralls should inherit defined seals
  // Forall types should set what type variables are defined
  //

  // Seal and unseal functions
  // -------------------------
  // Create global generic seal and unseal functions (will make it easier)
  // Essentially, all weakmaps should be inside their respective functions


  function add_type_variable(type, tyvar) {
    var enclosed_type_variables, new_type_variables, k;
    new_type_variables = {};

    if (type && _.isObject(type) && type_variables.has(type)) {
      enclosed_type_variables = type_variables.get(type);

      for (k in enclosed_type_variables) {
        if (enclosed_type_variables.hasOwnProperty(k)) {
          if (k === tyvar) {
            throw new Error('Type variables should be different');
          }

          new_type_variables[k] = true;
        }
      }
    }

    new_type_variables[tyvar] = true;

    return new_type_variables;
  }

  blame.forall = function (tyvar, type) {
    // Create the forall type here
    var description, new_type, my_type_variables;

    my_type_variables = add_type_variable(type, tyvar);

    // Create new type:
    description = 'Forall ' + tyvar + ', ' + type.description;

    // An additional contract that wraps the proxy into a new forall bindings
    function contract(value, label) {
      var handler = {
        apply: function (target, thisArg, args) {
          // Perform a lazy context generation here

          var lazy_type = new Type(type.description, type.contract),
            lazily_wrapped,
            context = {},
            key;

          // Change this to start using my_type_variables
          for (key in my_type_variables) {
            if (my_type_variables.hasOwnProperty(key)) {
              context[key] = new WeakMap();
            }
          }

          forall_contexts.set(lazy_type, context);

          lazily_wrapped = lazy_type.contract(target, label);

          // TODO: This needs to be performed by tfun, not forall
          return lazily_wrapped.apply(thisArg, args);
        }

        // TODO: Implement construct later
      };

      return new Proxy(value, handler);
    }

    new_type = new Type(description, contract);

    // Save the enclosed type variables
    type_variables.set(new_type, my_type_variables);

    return new_type;
  };


  // Generate the wrapper for a type variable
  blame.tyvar = function (id) {

    function contract(value, label, is_range) {
      var context, replacement;
      // Check if this contains a forall context associated with it?


      if (!(this && forall_contexts.has(this))) {

        throw new TypeError('This is not a forall context');
      }

      context = forall_contexts.get(this);

      if (!context[id]) {
        throw new Error('There is no type variable ' + id);
      }

      if (is_range) {
        // Unseal
        if (!(is_object(value) && context[id].has(value))) {
          // Raise blame label
          throw new Error('Conflict, blame ' + label);
        }

        replacement = context[id].get(value);

      } else {
        // Seal

        // Proxy need to be defined on a non-null value
        replacement = new Proxy(Object.create(null), panic_handler);
        context[id].set(replacement, value);
      }

      return replacement;
    }

    return new Type(id, contract);
  };

  // TODO: Clean this up
  panic_handler = (function (){
    function panic() {
      throw new Error('Confilict!');
    }
    var handler = {};

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

    return handler;
  }());

  // Sketching out proxies for Objects:

  // So similarly, there are values that can be tested without evaluating the
  // object:
  //  * Object.getPrototypeOf, unconditionally returns the prototype of target,
  //  * typeof proxy unconditionally returns typeof target
  //  * Object.prototype.toString.call(proxy) unconditionally returns
  //  Object prototype.toString.call(target)

  // Bacause essentially object is a closure, then all properties, aside from:
  //   * instanceof
  //   * typeof
  // are checked lazily by higher-order contracts.


  return blame;
});



// define('blame', [], function(){
//   var blame = Object.create(Object.prototype);
//
//   var origins = new WeakMap();
//
//   function get_origin(object) {
//     if ((typeof object === 'object' || typeof object === 'function') && origins.has(object)) {
//       return get_origin(origins.get(object));
//     }
//     return object;
//   }
//
//   // New Definition of Type
//   var Type = function(description, generator) {
//     if (!(this instanceof Type)) {
//       return new Type(description, generator);
//     }
//
//     this.description = String(description);
//     this.generator = generator;
//   };
//
//   Type.prototype.description = "";
//   Type.prototype.generator = function() {
//     throw new Error('Empty generator');
//   };
//
//   // Basic type check generator
//   function ground(type) {
//     return function (G) {
//       return (typeof G === type);
//     };
//   }
//
//   function simple_contract(test) {
//     return function(value, label) {
//       if(!test(value)) {
//         throw new Error(label);
//       }
//       return value;
//     };
//   }
//
//   // Simple generator which ignores the context
//   function simple_generator(contract) {
//     return function() {
//       return function() {
//         var args = Array.prototype.slice.call(arguments || []);
//         return contract.apply(undefined, args);
//       };
//     };
//   }
//
//   function basic(type) {
//     return simple_generator(simple_contract(ground(type)));
//   }
//
//   function isFunction(func) {
//     return func && {}.toString.call(func) === '[object Function]';
//   }
//
//   function typedef(identifier, generator) {
//     blame[identifier] = new Type(identifier, generator);
//   }
//
//   typedef('Num', basic('number'));
//   typedef('Str', basic('string'));
//   typedef('Bool', basic('boolean'));
//   typedef('Fun', simple_generator(simple_contract(isFunction)));
//
//   function wrap(type, value, label) {
//     var contract = type.generator();
//     return contract(value, label);
//   }
//
//   // Compose two contracts
//   // TODO: Consider composing many contracts
//   function compose(f, g) {
//     return function() {
//       var args = Array.prototype.slice.apply(arguments || []);
//       // The first argument is the value
//       // The rest of arguments are context
//       var other_args = args.slice(1);
//       return g.apply(this, [f.apply(this, args)].concat(other_args));
//     };
//   }
//
//   function compose_generators(F, G) {
//     return function() {
//       var args = Array.prototype.slice.apply(arguments || []);
//       var f = F.apply(undefined, args);
//       var g = G.apply(undefined, args);
//       return compose(f, g);
//     };
//   }
//
//   function function_description(args) {
//     var descriptions = [];
//     args.forEach(function(arg, index) {
//       if (!(arg instanceof Type)) {
//         throw new Error('argument ' + index + ' is not a Type');
//       }
//
//       var new_description = arg.description;
//       if (new_description.indexOf(' -> ') !== -1) {
//         new_description = '(' + new_description + ')';
//       }
//
//       descriptions.push(new_description);
//     });
//
//     return descriptions.join(' -> ');
//   }
//
//   function TFun() {
//     var args = Array.prototype.slice.call(arguments || []);
//
//     if (args.length < 2) {
//       throw new Error('Not enough arguments');
//     }
//
//     var description = function_description(args);
//     var domain = args.slice(0, -1);
//     var range = args[args.length - 1];
//
//     // Not sure if I should perform composition on whole types, not just contracts
//
//     var new_generator = function(context){
//       return function(func, label) {
//         var negated = '~' + label;
//
//
//         var wrapped = function() {
//           var fun_args = Array.prototype.slice.call(arguments || []);
//           var wrapped_args = [];
//           var contract;
//
//           fun_args.forEach(function (arg, index) {
//             if (index < domain.length) {
//               contract = domain[index].generator(context);
//               wrapped_args.push(contract(arg, negated, arg));
//             }
//             else {
//               // TODO: Decide what to do with the arity
//               wrapped_args.push(arg);
//             }
//           });
//
//           contract = range.generator(context, true);
//
//           var result = func.apply(undefined, wrapped_args);
//           // Is this needed?
//           return contract(result, label);
//         };
//
//         origins.set(wrapped, func);
//
//         return wrapped;
//       };
//     };
//
//     return new Type(description, compose_generators(blame.Fun.generator, new_generator));
//   }
//
//   function sealing(context, variable) {
//     return function(value, label) {
//       var token = context.tokens[variable];
//
//       if (token) {
//         var origin = get_origin(value);
//         if (context.keeps[variable] && context.origins[variable] !== origin) {
//             context.reset();
//             throw new Error(label);
//         }
//
//         context.keeps[variable] = value;
//         context.origins[variable] = origin;
//         return token;
//       }
//       context.reset();
//       throw new Error(label);
//     };
//   }
//
//   function unsealing(context, variable) {
//     return function(value, label) {
//       var token = context.tokens[variable];
//       if (token && token === value) {
//         var result = context.keeps[variable];
//         context.reset();
//         return result;
//       }
//       throw new Error(label);
//     };
//   }
//
//   var Tyvar = function(variable) {
//     if (!(this instanceof Tyvar)) {
//       return new Tyvar(variable);
//     }
//
//     var generator = function(context, isLast) {
//       if (isLast) {
//         return unsealing(context, variable);
//       }
//       return sealing(context, variable);
//     };
//
//     Type.call(this, variable, generator);
//   };
//
//   Tyvar.prototype = Object.create(Type.prototype);
//
//   // TODO: Refactor context into a Class
//   function generate_context(Xs) {
//     var context = {};
//     context.reset = function() {
//       context.tokens = {};
//       context.keeps = {};
//       context.origins = {};
//       // Generate the tokens for all type variables
//       Xs.forEach(function (variable) {
//         var new_token = Object.create(null);
//         Object.freeze(new_token);
//         context.tokens[variable] = new_token;
//       });
//     };
//
//     context.reset();
//
//     return context;
//   }
//
//   function Forall (X, type) {
//
//     if (!(this instanceof Forall)) {
//       return new Forall(X, type);
//     }
//
//     var Xs = X;
//
//     if (typeof X === 'string') {
//       Xs = [X];
//     }
//
//     var description = 'forall X, ' + type.description;
//
//     // This does not work
//     var generator = function() {
//       var context = generate_context(Xs);
//       var contract = type.generator(context);
//       return contract;
//     };
//
//     Type.call(this, description, generator);
//   }
//
//   Forall.prototype = Object.create(Type.prototype);
//
//   blame.wrap = wrap;
//   blame.TFun = TFun;
//   blame.Tyvar = Tyvar;
//   blame.Forall = Forall;
//
//   return blame;
// });

// vim: set ts=2 sw=2 sts=2 et :
