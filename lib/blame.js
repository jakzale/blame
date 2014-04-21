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

  var Type = function(name, contract) {
    if (!(this instanceof Type)) {
      return new Type(name, contract);
    }

    this.name = String(name);
    this.contract = contract;

    // TODO: Consider removing this
    //Object.freeze(this);
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
  // Inject the context passed to compose into both methods.
  function compose(f, g) {
    return function(value, label) {
      return g.call(this, f.call(this, value, label), label);
    };
  }

  // * => *
  typedef('Fun', contract(isFunction));

  // TODO: Add support for n-ary function definitions
  function TFun() {
    var args = Array.prototype.slice.call(arguments || []);
    var names = [];

    if (args.length < 2) {
      throw new Error('Not enough arguments');
    }

    args.forEach(function (type, index) {
      if (!(type instanceof Type)) {
        throw new TypeError('argument ' + index + ' is not a Type');
      }
      names.push( '(' + type.name + ')');
    });

    var domain = args.slice(0, -1);
    var range = args[args.length - 1];

    var name = names.join(' -> ');
    // Not sure if I should perform composition on whole types, not just contracts
    var new_contract = compose.call(this, blame.Fun.contract, function(func, label) {
      var negated = '~' + label;
      var that = this;

      // This will be replaced by a Proxy
      return function() {
        var fun_args = Array.prototype.slice.call(arguments || []);
        var wrapped_args = [];

        fun_args.forEach(function (arg, index) {
          if (index < domain.length) {
            wrapped_args.push(domain[index].contract.call(that, arg, negated));
          }
          else {
            wrapped_args.push(arg);
          }
        });

        return range.contract.call(that, func.apply(undefined, wrapped_args), label, true);
      };
    });

    return new Type(name, new_contract);
  }

  // Adding polymorphic types
  // Forall('X', Fun(Tyvar('X'), Tyvar('X')))

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
    return new Type(name, compose(blame.Fun.contract, polymorphic));
  }

  // Forall constructor
  var Forall = function(X, type) {
    if (!(this instanceof Forall)) {
      return new Forall(X, type);
    }

    // Consider checking for the type
    var name = 'forall ' + X + ', ' + type.name;

    // Create secure storage for keeps:
    (function(obj) {
      var tokens = Object.create(null);
      var token = Object.create(null);
      Object.freeze(token);
      tokens[X] = token;
      var storage = Object.create(null);

      obj.have = function(name, value) {
        return tokens[name] && tokens[name] === value && true;
      };

      obj.get = function(name, value) {
        if (tokens[name] === value) {
          return storage[name];
        }
      };

      obj.keep = function(name, value) {
        if (tokens[name]) {
          if (storage[name]) {
            // Return token, only if the values are identical
            if (storage[name] === value) {
              return tokens[name];
            }
          }
          storage[name] = value;
          return tokens[name];
        }
      };
    }(this));

    Type.call(this, name, type.contract);
  };

  // Tyvar constructor
  var Tyvar = function(name) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(name);
    }

    var ty_contract = function(value, label, isLast) {
      if (!(this instanceof Forall)) {
        // TODO: Figure what to throw later
        throw new Error();
      }
      // Attempt to unseal the value:
      if(isLast) {
        var result = this.have(name, value);
        if (!result) {
          throw new Error(label);
        }
        return this.get(name, value);
      }
      // Attempt to seal the value:
      var token = this.keep(name, value);
      if (!token) {
        throw new Error(label);
      }
      return token;
    };

    Type.call(this, name, ty_contract);
  };


  // TODO: Consider changing the prototype chain to forall -> (Fun|TFun) -> Type
  Forall.prototype = Object.create(Type.prototype);
  Tyvar.prototype = Object.create(Type.prototype);

  // Exporting
  blame.wrap = wrap;
  blame.TFun = TFun;
  blame.TForall = TForall;
  blame.Forall = Forall;
  blame.Tyvar = Tyvar;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
