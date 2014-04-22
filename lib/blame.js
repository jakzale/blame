/*global define, window, WeakMap */

define('blame', [], function(){
  var blame = Object.create(Object.prototype);


  var origins = new WeakMap();

  function get_origin(object) {
    if ((typeof object === 'object' || typeof object === 'function') && origins.has(object)) {
      return get_origin(origins.get(object));
    }
    return object;
  }

  // New Definition of Type
  var Type = function(description, generator) {
    if (!(this instanceof Type)) {
      return new Type(description, generator);
    }

    this.description = String(description);
    this.generator = generator;
  };

  Type.prototype.description = "";
  Type.prototype.generator = function() {
    throw new Error('Empty generator');
  };

  // Basic type check generator
  function ground(type) {
    return function (G) {
      return (typeof G === type);
    };
  }

  function simple_contract(test) {
    return function(value, label) {
      if(!test(value)) {
        throw new Error(label);
      }
      return value;
    };
  }

  // Simple generator which ignores the context
  function simple_generator(contract) {
    return function() {
      return function() {
        var args = Array.prototype.slice.call(arguments || []);
        return contract.apply(undefined, args);
      };
    };
  }

  function basic(type) {
    return simple_generator(simple_contract(ground(type)));
  }

  function isFunction(func) {
    return func && {}.toString.call(func) === '[object Function]';
  }

  function typedef(identifier, generator) {
    blame[identifier] = new Type(identifier, generator);
  }

  typedef('Num', basic('number'));
  typedef('Str', basic('string'));
  typedef('Bool', basic('boolean'));
  typedef('Fun', simple_generator(simple_contract(isFunction)));

  function wrap(type, value, label) {
    var contract = type.generator();
    return contract(value, label);
  }

  // Compose two contracts
  // TODO: Consider composing many contracts
  function compose(f, g) {
    return function() {
      var args = Array.prototype.slice.apply(arguments || []);
      // The first argument is the value
      // The rest of arguments are context
      var other_args = args.slice(1);
      return g.apply(this, [f.apply(this, args)].concat(other_args));
    };
  }

  function compose_generators(F, G) {
    return function() {
      var args = Array.prototype.slice.apply(arguments || []);
      var f = F.apply(undefined, args);
      var g = G.apply(undefined, args);
      return compose(f, g);
    };
  }

  function function_description(args) {
    var descriptions = [];
    args.forEach(function(arg, index) {
      if (!(arg instanceof Type)) {
        throw new Error('argument ' + index + ' is not a Type');
      }

      var new_description = arg.description;
      if (new_description.indexOf(' -> ') !== -1) {
        new_description = '(' + new_description + ')';
      }

      descriptions.push(new_description);
    });

    return descriptions.join(' -> ');
  }

  function TFun() {
    var args = Array.prototype.slice.call(arguments || []);

    if (args.length < 2) {
      throw new Error('Not enough arguments');
    }

    var description = function_description(args);
    var domain = args.slice(0, -1);
    var range = args[args.length - 1];

    // Not sure if I should perform composition on whole types, not just contracts

    var new_generator = function(context){
      return function(func, label) {
        var negated = '~' + label;


        var wrapped = function() {
          var fun_args = Array.prototype.slice.call(arguments || []);
          var wrapped_args = [];
          var contract;

          fun_args.forEach(function (arg, index) {
            if (index < domain.length) {
              contract = domain[index].generator(context);
              wrapped_args.push(contract(arg, negated, arg));
            }
            else {
              // TODO: Decide what to do with the arity
              wrapped_args.push(arg);
            }
          });

          contract = range.generator(context, true);

          var result = func.apply(undefined, wrapped_args);
          // Is this needed?
          return contract(result, label);
        };

        origins.set(wrapped, func);

        return wrapped;
      };
    };

    return new Type(description, compose_generators(blame.Fun.generator, new_generator));
  }

  function sealing(context, variable) {
    return function(value, label) {
      var token = context.tokens[variable];

      if (token) {
        var origin = get_origin(value);
        if (context.keeps[variable] && context.origins[variable] !== origin) {
            context.reset();
            throw new Error(label);
        }

        context.keeps[variable] = value;
        context.origins[variable] = origin;
        return token;
      }
      context.reset();
      throw new Error(label);
    };
  }

  function unsealing(context, variable) {
    return function(value, label) {
      var token = context.tokens[variable];
      if (token && token === value) {
        var result = context.keeps[variable];
        context.reset();
        return result;
      }
      throw new Error(label);
    };
  }

  var Tyvar = function(variable) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(variable);
    }

    var generator = function(context, isLast) {
      if (isLast) {
        return unsealing(context, variable);
      }
      return sealing(context, variable);
    };

    Type.call(this, variable, generator);
  };

  Tyvar.prototype = Object.create(Type.prototype);

  // TODO: Refactor context into a Class
  function generate_context(Xs) {
    var context = {};
    context.reset = function() {
      context.tokens = {};
      context.keeps = {};
      context.origins = {};
      // Generate the tokens for all type variables
      Xs.forEach(function (variable) {
        // TODO: Change this to Object.create(null);
        var new_token = {};
        Object.freeze(new_token);
        context.tokens[variable] = new_token;
      });
    };

    context.reset();

    return context;
  }

  function Forall (X, type) {

    if (!(this instanceof Forall)) {
      return new Forall(X, type);
    }

    var Xs = X;

    if (typeof X === 'string') {
      Xs = [X];
    }

    var description = 'forall X, ' + type.description;

    // This does not work
    var generator = function() {
      var context = generate_context(Xs);
      var contract = type.generator(context);
      return contract;
    };

    Type.call(this, description, generator);
  }

  Forall.prototype = Object.create(Type.prototype);

  blame.wrap = wrap;
  blame.TFun = TFun;
  blame.Tyvar = Tyvar;
  blame.Forall = Forall;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
