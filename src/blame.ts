// Blame

var count: number = 0;

declare function Proxy(target: any, handler: {}): void;

export class Label {
  private _label: string;
  private _status: boolean;

  constructor(label?: string, status?: boolean) {

    if (label !== undefined) {
      this._label = String(label);
    } else {
      this._label = "label_" + count;
      count += 1;
    }

    if (status !== undefined) {
      this._status = !!status;
    } else {
      this._status = true;
    }

  }

  public label(): string {
    return this._label;
  }

  public status(): boolean {
    return this._status;
  }

  public negated(): Label {
    return new Label(this.label(), !this.status());
  }

  public msg(m: string): string {
    var stat: string = this.status() ? "positive" : "negative";
    var message: string = "";

    if (m) {
      message = " " + m;
    }

    return "{" + stat + " " + this.label() + "}" + message;
  }
}

export enum TypeKind {
  AnyType,
  BaseType,
  FunctionType,
  ForallType,
  TypeVariable,
  BoundTypeVariable,
  ArrayType,
  ObjectType
}

export interface IType {
  description: string;
  kind(): TypeKind;
}

export class BaseType implements IType {
  constructor(public description: string, public contract: (any) => boolean) {}
  public kind(): TypeKind {
    return TypeKind.BaseType;
  }
}

// Declaring BaseTypes
export var Num = new BaseType("Num", function (value: any): boolean {
  return typeof value === "number";
});

export var Bool = new BaseType("Bool", function (value: any): boolean {
  return typeof value === "boolean";
});

export var Str = new BaseType("Str", function (value: any): boolean {
  return typeof value === "string";
});

export var Void = new BaseType("Void", function (value: any): boolean {
  return typeof value === "undefined";
});

// Private BaseTypes, used by other types
var Obj = new BaseType("Obj", function (value: any): boolean {
  return typeof value === "object";
});

var Fun = new BaseType("Fun", function (value: any): boolean {
  return typeof value === "function";
});

var Arr = new BaseType("Arr", function (value: any): boolean {
  return Array.isArray(value);
});

// Declaring Type Any
export var Any: IType = {
  description: "Any",
  kind: function(): TypeKind {
    return TypeKind.AnyType;
  }
};


function description(postfix: string): (IType) => string {
  return function (arg: IType): string {
    var desc = arg.description;
    if ((arg.kind() === TypeKind.FunctionType) ||
        (arg.kind() === TypeKind.ForallType)) {
          desc = "(" + desc + ")";
        }

    return desc + postfix;
  };
}

export class FunctionType implements IType {
  public requiredParameters: IType[];
  public optionalParameters: IType[];
  public restParameter: IType;
  public returnType: IType;
  public constructType: IType;

  public description: string;

  constructor(requiredParameters: IType[],
      optionalParameters: IType[],
      restParameter: IType,
      returnType: IType,
      constructType: IType) {

    this.requiredParameters = requiredParameters || [];
    this.optionalParameters = optionalParameters || [];
    this.restParameter = restParameter;
    this.returnType = returnType || Any;
    this.constructType = constructType || Any;

    var descs: string[] = ([])
      .concat(this.requiredParameters.map(description("")),
          this.optionalParameters.map(description("?")));

    if (this.restParameter) {
      descs.push(description("*")(this.restParameter));
    }

    if (this.requiredParameters.length === 0 &&
        this.optionalParameters.length === 0 &&
        !this.restParameter) {
      descs.push("()");
    }

    descs.push(description("")(this.returnType));

    this.description = descs.join(" -> ") + "  C:" + this.constructType.description;
  }

  public kind(): TypeKind {
    return TypeKind.FunctionType;
  }
}

export function fun(range: IType[], optional: IType[], rest: IType, ret: IType): FunctionType {
  return new FunctionType(range, optional, rest, ret);
}

export function func(...args: IType[]) {
  if (args.length < 0) {
    throw Error("Func needs at least one argument");
  }

  var returnType: IType = args.pop();

  return new FunctionType(args, null, null, returnType);
}

export class ForallType implements IType {
  public description: string;

  constructor(public tyvar: string, public type: IType) {
    switch (type.kind()) {
      case TypeKind.FunctionType:
      case TypeKind.ForallType:
        break;

      default:
        throw new Error("Panic, type " + type.description + " not supported for forall");
    }

    this.description = "forall " + this.tyvar + ". " + this.type.description;
  }

  public kind(): TypeKind {
    return TypeKind.ForallType;
  }
}

export function forall(tyvar: string, type: IType) {
  return new ForallType(String(tyvar), type);
}

export class TypeVariable implements IType {
  constructor(public description: string) {
  }

  public kind(): TypeKind {
    return TypeKind.TypeVariable;
  }
}

export function tyvar(id: string): TypeVariable {
  return new TypeVariable(id);
}

class BoundTypeVariable extends TypeVariable {
  public seal: (any) => Token;
  public unseal: (Token, Label) => any;

  constructor(description: string) {
    super(description);

    var storage: WeakMap<Token, any> = new WeakMap();

    this.seal = function(value: any): Token {
      var t: Token = new Token(this.description);

      storage.set(t, value);

      return t;
    };

    this.unseal = function(t: Token, q: Label): any {
      if (!(t instanceof Token)) {
        throw new Error(q.negated().msg(t + " is not a sealed token (" + this.description + ")"));
      }
      if (storage.has(t)) {
        return storage.get(t);
      }

      throw Error(q.negated().msg("Token: " + t.tyvar + " sealed by a different forall"));
    };
  }

  public kind(): TypeKind {
    return TypeKind.BoundTypeVariable;
  }
}

class Token {
  constructor(public tyvar: string) {}
}

export class ArrayType implements IType {
  public description: string;

  constructor(public type: IType) {
    this.description = "[" + this.type.description + "]";
  }

  public kind(): TypeKind {
    return TypeKind.ArrayType;
  }
}

export function arr(type: IType): ArrayType {
  return new ArrayType(type);
}

export interface TypeDict {
  [id: string]: IType
}

export class ObjectType implements IType {
  public description: string;
  public properties: TypeDict;

  constructor(properties: TypeDict) {
    this.properties = Object.create(null);

    var descs: string[] = [];

    for (var key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        this.properties[key] = properties[key];
        descs.push(key + ": " + properties[key].description);
        this.description = "{" + descs.join(", ") + "}";
      }
    }
  }

  public kind(): TypeKind {
    return TypeKind.ObjectType;
  }
}

export function obj(properties: TypeDict): ObjectType {
  return new ObjectType(properties);
}

// TODO Consider adding a new type for a bound type variable
function substitute_tyvar(target: IType, ty: string, new_type: IType): IType {
  switch (target.kind()) {
    case TypeKind.AnyType:
    case TypeKind.BaseType:
    case TypeKind.BoundTypeVariable:
      return target;

    case TypeKind.FunctionType:
      return substitute_tyvar_fun(<FunctionType> target, ty, new_type);

    case TypeKind.ForallType:
      return substitute_tyvar_forall(<ForallType> target, ty, new_type);

    case TypeKind.TypeVariable:
      return substitute_tyvar_tyvar(<TypeVariable> target, ty, new_type);

    case TypeKind.ArrayType:
      return substitute_tyvar_arr(<ArrayType> target, ty, new_type);

    case TypeKind.ObjectType:
      return substitute_tyvar_obj(<ObjectType> target, ty, new_type);

    default:
      throw new Error("Panic: unsupported type " + target.description +
          "in tyvar substitution");
  }
}

function substitute_tyvar_fun(target: FunctionType, ty: string, new_type: IType): FunctionType {
  function substitute(p: IType) {
    return substitute_tyvar(p, ty, new_type);
  }

  var requiredParameters: IType[] = target.requiredParameters.map(substitute);
  var optionalParameters: IType[] = target.optionalParameters.map(substitute);
  var restParameter: IType = null;
  if (target.restParameter) {
    restParameter = substitute(target.restParameter);
  }

  var returnType: IType = substitute(target.returnType);
  var constructType: IType = substitute(target.constructType);

  return new FunctionType(requiredParameters, optionalParameters, restParameter, returnType, constructType);
}

function substitute_tyvar_forall(target: ForallType, ty: string, new_type: IType): ForallType {
  if (target.tyvar === ty) {
    return target;
  }

  return new ForallType(target.tyvar, substitute_tyvar(target.type, ty, new_type));
}

function substitute_tyvar_tyvar(target: TypeVariable, ty: string, new_type: IType): TypeVariable {
  if (target.description === ty) {
    return new_type;
  }

  return target;
}

function substitute_tyvar_arr(target: ArrayType, ty: string, new_type: IType): ArrayType {
  return new ArrayType(substitute_tyvar(target.type, ty, new_type));
}

function substitute_tyvar_obj(target: ObjectType, ty: string, new_type: IType): ObjectType {
  var properties: TypeDict = Object.create(null);

  for (var key in target.properties) {
    if (Object.prototype.hasOwnProperty.call(target.properties, key)) {
      properties[key] = substitute_tyvar(target.properties[key], ty, new_type);
    }
  }

  return new ObjectType(properties);
}

function compatible_base(A: BaseType, B: BaseType): boolean {
  return A === B;
}

function compatible_fun(A: FunctionType, B: FunctionType): boolean {
  return A.requiredParameters.length === B.requiredParameters.length &&
    A.optionalParameters.length === B.optionalParameters.length &&
    (!!A.restParameter) === (!!B.restParameter);
}

function compatible_forall(A: ForallType, B: ForallType): boolean {
  return A.tyvar === B.tyvar;
}

function compatible_obj(A: ObjectType, B: ObjectType): boolean {
  for (var key in A.properties) {
    if (Object.prototype.hasOwnProperty.call(A, key)) {
      if (!Object.prototype.hasOwnProperty.call(B, key)) {
        return false;
      }
    }
  }

  return true;
}

export function simple_wrap(value: any, A: IType): any {
  var p = new Label();

  return wrap(value, p, p.negated(), A, A);
}

export function wrap(value: any, p: Label, q: Label, A: IType, B: IType): any {
  var a: TypeKind = A.kind();
  var b: TypeKind = B.kind();

  if (a === b) {
    switch (a) {
      case TypeKind.AnyType:
        return value;

      case TypeKind.BaseType:
        if (compatible_base(<BaseType> A, <BaseType> B)) {
          return wrap_base(value, p, <BaseType> A);
        }
        break;

      case TypeKind.FunctionType:
        if (compatible_fun(<FunctionType> A, <FunctionType> B)) {
          return wrap_fun(value, p, q, <FunctionType> A, <FunctionType> B);
        }
        break;

      case TypeKind.ForallType:
        if (compatible_forall(<ForallType> A, <ForallType> B)) {
          return wrap_forall(value, p, q, <ForallType> A, <ForallType> B);
        }
        break;

      case TypeKind.ArrayType:
        // Arrays are always compatible
        return wrap_arr(value, p, q, <ArrayType> A, <ArrayType> B);

      case TypeKind.ObjectType:
        if (compatible_obj(<ObjectType> A, <ObjectType> B)) {
          return wrap_obj(value, p, q, <ObjectType> A, <ObjectType> B);
        }
        break;
    }
  }

  // Seal And Unseal

  if (a === TypeKind.AnyType && b === TypeKind.BoundTypeVariable) {
    return (<BoundTypeVariable> B).seal(value);
  }

  if (a === TypeKind.BoundTypeVariable && b === TypeKind.AnyType) {
    return (<BoundTypeVariable> A).unseal(value, q);
  }

  throw new Error("Panic, A: " + A.description + " and B: " + B.description + " are not compatible");
}

function wrap_base(value: any, p: Label, A: BaseType): any {
  if (!A.contract(value)) {
    throw new Error(p.msg("not of type " + A.description));
  }

  return value;
}

function wrap_fun(value: any, p: Label, q: Label, A: FunctionType, B: FunctionType) {
  // Checking if value is a function
  value = wrap_base(value, p, Fun);

  return new Proxy(value, {
    apply: function (target: any, thisValue: any, args: any[]): any {
      var nArgs: number = args.length;
      var minArgs: number = A.requiredParameters.length;
      var maxArgs: number = (A.requiredParameters.length + A.optionalParameters.length);

      if (nArgs < minArgs) {
        throw new Error(q.msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
      }

      if (nArgs > maxArgs && !A.restParameter) {
        throw new Error(q.msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
      }

      var wrapped_args: any[] = [];

      for (var i = 0; i < A.requiredParameters.length; i++) {
        wrapped_args.push(wrap(args[i], q, p, B.requiredParameters[i], A.requiredParameters[i]));
      }

      for (var j = 0; j < A.optionalParameters.length && (i + j) < args.length; j++) {
        wrapped_args.push(wrap(args[i + j], q, p, B.optionalParameters[j], A.optionalParameters[j]));
      }

      for (var k = i + j; k < args.length; k++) {
        wrapped_args.push(wrap(args[k], q, p, B.restParameter, A.restParameter));
      }

      var ret = target.apply(thisValue, wrapped_args);

      return wrap(ret, p, q, A.returnType, B.returnType);
    },
    construct: function (target: any, args: any[]): any {
      var nArgs: number = args.length;
      var minArgs: number = A.requiredParameters.length;
      var maxArgs: number = (A.requiredParameters.length + A.optionalParameters.length);

      if (nArgs < minArgs) {
        throw new Error(q.msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
      }

      if (nArgs > maxArgs && !A.restParameter) {
        throw new Error(q.msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
      }

      var wrapped_args: any[] = [];

      for (var i = 0; i < A.requiredParameters.length; i++) {
        wrapped_args.push(wrap(args[i], q, p, B.requiredParameters[i], A.requiredParameters[i]));
      }

      for (var j = 0; j < A.optionalParameters.length && (i + j) < args.length; j++) {
        wrapped_args.push(wrap(args[i + j], q, p, B.optionalParameters[j], A.optionalParameters[j]));
      }

      for (var k = i + j; k < args.length; k++) {
        wrapped_args.push(wrap(args[k], q, p, B.restParameter, A.restParameter));
      }

      // Create the instance
      var instance = Object.create(target.prototype);

      // Create wrapped instance for the constructor;
      // Swapping the labels
      // Eager constructor enforcement
      var cons_instance = wrap(instance, q, p, A.constructType, B.constructType);

      target.apply(cons_instance, wrapped_args);

      // Returning wrapped instance for the rest of the program
      return wrap(instance, p, q, A.constructType, B.constructType);
    }
  });
}


function wrap_forall(value: any, p: Label, q: Label, A: ForallType, B: ForallType): any {
  value = wrap_base(value, p, Fun);

  return new Proxy(value, {
    apply: function (target: any, thisValue: any, args: any[]): any {
      var XX = new BoundTypeVariable(A.tyvar + "'");

      var A_XX: IType = substitute_tyvar(A.type, A.tyvar, XX);
      var B_prim: IType = substitute_tyvar(B.type, B.tyvar, Any);

      var wrapped_fun = wrap(target, p, q, A_XX, B_prim);

      return wrapped_fun.apply(thisValue, args);
    }
  });
}

function is_index(value: string): boolean {
  // Bitwise necessary for checking if the number is array index
  var index = Number(value) >>> 0;
  return value === index.toString() && index !== (-1 >>> 0);
}

function wrap_arr(value: any, p: Label, q: Label, A: ArrayType, B: ArrayType): any {
  value = wrap_base(value, p, Arr);

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {

      if (is_index(name)) {
        return wrap(target[name], p, q, A.type, B.type);
      }

      return target[name];
    },
   set: function (target: any, name: string, val: any, receiver: any): void {
     if (is_index(name)) {
       target[name] = wrap(val, q, p, B.type, A.type);

       return;
     }

     target[name] = val;
   }

  });
}

function wrap_obj(value: any, p: Label, q: Label, A: ObjectType, B: ObjectType): any {
  //value = wrap_base(value, p, Obj);

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {
      if (Object.prototype.hasOwnProperty.call(A.properties, name)) {
        var A_type: IType = A.properties[name];
        var B_type: IType = B.properties[name];

        return wrap(target[name], p, q, A_type, B_type);
      }

      return target[name];
    },
    set: function (target: any, name: string, val: any, receiver: any): void {
      if (Object.prototype.hasOwnProperty.call(A.properties, name)) {
        var A_type: IType = A.properties[name];
        var B_type: IType = B.properties[name];

        target[name] = wrap(val, q, p, B_type, A_type);
        return;
      }

      target[name] = val;
    }
  });
}


// vim: set ts=2 sw=2 sts=2 et :
