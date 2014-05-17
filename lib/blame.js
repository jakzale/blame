/*global define, window, WeakMap, console */
/*jslint indent: 2, todo: true */
/*

# Some technical notes for Writing Blame

*/

define('blame', [], function () {
  'use strict';

  var blame = Object.create(Object.prototype),
    forall_contexts = new WeakMap();

  // Simple local tests:
  function is_function(func) {
    return func && {}.toString.call(func) === '[object Function]';
  }

  function is_object(obj) {
    return obj && (typeof obj === 'object');
  }

  // Type Definition
  function Type(description, contract) {
    if (!(this instanceof Type)) {
      return new Type(description, contract);
    }

    this.description = String(description);

    if (!is_function(contract)) {
      throw new Error('Test is not a function');
    }
    this.contract = contract;
  }

  Type.prototype.contract = function () {
    throw new Error('Empty test');
  };

  // Publish type
  blame.Type = Type;

  function ground(type) {
    return function (G) {
      var actual = typeof G;
      return (actual === type);
    };
  }

  function simple_contract(test) {
    return function (value, label) {
      if (!test(value)) {
        throw new Error(label);
      }
      return value;
    };
  }

  function basic(type) {
    return simple_contract(ground(type));
  }

  function typedef(name, contract) {
    blame[name] = new Type(name, contract);
  }

  typedef('Num', basic('number'));
  typedef('Str', basic('string'));
  typedef('Bool', basic('boolean'));
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

  // Simple Contract Composition
  function compose_contracts(g, h) {
    return function () {
      var args = Array.prototype.slice.call(arguments || []),
        interim = g.apply(this, args);

      args[0] = interim;

      return h.apply(this, args);
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

  blame.tFun = function () {
    // Accept multiple arguments
    var args = Array.prototype.slice.call(arguments || []),
      descriptions = [],
      description,
      domain,
      range;

    if (args.length < 2) {
      throw new Error('Not enough arguments');
    }

    // Check if all arguments are Type and generate descriptions
    args.forEach(function (arg, index) {
      if (!(arg instanceof Type)) {
        throw new Error('argument ' + index + ' is not a Type');
      }

      // Generate description
      var new_description = arg.description;
      if (new_description.indexOf(' -> ') !== -1) {
        new_description = '(' + new_description + ')';
      }

      descriptions.push(new_description);
    });

    // Generate the description
    description = descriptions.join(' -> ');

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
            var wrapped_args = wrap_arguments(args, domain, negated, that),
              result = target.apply(thisArg, wrapped_args);

            return range.contract.call(that, result, label, true);
          },
          construct: function (target, args) {
            var wrapped_args = wrap_arguments(args, domain, negated, that),
              instance = Object.create(target.prototype);

            target.apply(instance, wrapped_args);

            return range.contract.call(that, instance, label, true);
          }
        };

      return new Proxy(fun, handler);
    }

    return new Type(description, compose_contracts(blame.Fun.contract, contract));
  };

  // Polymorhic Proxy Wrapper
  // ------------------------
  // Generate a polymorphic proxy wrapper
  blame.forall = function (tyvar, type) {
    // Create the forall type here
    var description, new_type;

    // Create new type:
    description = 'Forall ' + tyvar + ', ' + type.description;

    // An additional contract that wraps the proxy into a new forall bindings
    function contract(value, label) {
      var handler = {
        apply: function (target, thisArg, args) {
          // Perform a form of lazy wrapping here:
          var lazy_type = new Type(type.description, type.contract),
            lazily_wrapped,
            context = {};

          context[tyvar] = new WeakMap();
          forall_contexts.set(lazy_type, context);

          lazily_wrapped = lazy_type.contract(target, label);

          return lazily_wrapped.apply(thisArg, args);
        }
        // TODO: Implement construct later
      };

      return new Proxy(value, handler);
    }

    new_type = new Type(description, contract);

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
        replacement = {};
        context[id].set(replacement, value);
      }

      return replacement;
    }

    return new Type(id, contract);
  };

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
