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
  DictionaryType,
  ObjectType,
  HybridType,
  SumType,
  LazyType,
  BoundLazyType
}

export interface IType {
  description: string;
  kind(): TypeKind;
  reporter: IReporter;
  clone(reporter?: IReporter);
}


export interface IReporter {
  report(msg: string): void;
}

var GlobalReporter : IReporter = {
  report(msg: string): void {
    throw new Error(msg);
  }
};

export class BaseType implements IType {
  public reporter: IReporter;

  constructor(public description: string, public contract: (any) => boolean, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
  }
  public kind(): TypeKind {
    return TypeKind.BaseType;
  }
  public clone(reporter?: IReporter): BaseType {
    return new BaseType(this.description, this.contract, reporter || this.reporter);
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
export var Obj = new BaseType("Obj", function (value: any): boolean {
  return typeof value === "object";
});

export var Fun = new BaseType("Fun", function (value: any): boolean {
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
  },
  reporter: null,
  clone(reporter?: IReporter) {
    return this;
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

  public reporter: IReporter;

  public description: string;

  constructor(requiredParameters: IType[],
      optionalParameters: IType[],
      restParameter: IType,
      returnType: IType,
      constructType: IType,
      reporter?: IReporter) {

    this.reporter = reporter || GlobalReporter;

    var copy = (type) => { return type.clone(this.reporter); };

    this.requiredParameters = (requiredParameters || []).map(copy);
    this.optionalParameters = (optionalParameters || []).map(copy);

    this.restParameter = null;
    if (restParameter) {
      this.restParameter = copy(restParameter);
    }

    this.returnType = copy(returnType || Any);
    this.constructType = copy(constructType || Any);

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

    this.description = descs.join(" -> ");

    if (this.constructType !== Any) {
    this.description += "  C:" + this.constructType.description;
    }
  }

  public kind(): TypeKind {
    return TypeKind.FunctionType;
  }

  public clone(reporter?: IReporter) {
    return new FunctionType(this.requiredParameters, this.optionalParameters, this.restParameter, this.returnType, this.constructType,
        reporter || this.reporter);
  }
}

export function fun(range: IType[], optional: IType[], rest: IType, ret: IType, cons: IType): FunctionType {
  return new FunctionType(range, optional, rest, ret, cons);
}

export function func(...args: IType[]) {
  if (args.length < 0) {
    throw Error("Panic, Func needs at least one argument");
  }

  var returnType: IType = args.pop();

  return new FunctionType(args, [], null, returnType, null);
}

export class ForallType implements IType {

  public reporter: IReporter;
  public type: IType;

  public description: string;

  constructor(public tyvar: string, type: IType, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;

    switch (type.kind()) {
      case TypeKind.FunctionType:
      case TypeKind.ForallType:
        break;

      default:
        throw new Error("Panic, type " + type.description + " not supported for forall");
    }

    this.type = type.clone(this.reporter);

    this.description = "forall " + this.tyvar + ". " + this.type.description;
  }

  public kind(): TypeKind {
    return TypeKind.ForallType;
  }

  public clone(reporter?: IReporter): ForallType {
    if (reporter && reporter !== GlobalReporter) {
      throw new Error("Panic, sum types with foralls are not suported");
    }
    return new ForallType(this.tyvar, this.type, reporter || this.reporter);
  }
}

export function forall(tyvar: string, type: IType) {
  return new ForallType(String(tyvar), type);
}

export class TypeVariable implements IType {
  public reporter: IReporter;

  constructor(public description: string, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
  }

  public kind(): TypeKind {
    return TypeKind.TypeVariable;
  }

  public clone(reporter?: IReporter): TypeVariable {
    if (reporter && reporter !== GlobalReporter) {
      throw new Error("Panic, sum types with foralls are not suported");
    }
    return new TypeVariable(this.description, reporter || this.reporter);
  }
}

export function tyvar(id: string): TypeVariable {
  return new TypeVariable(id);
}

class BoundTypeVariable extends TypeVariable {
  public storage: WeakMap<Token, any>;

  constructor(description: string, storage?: WeakMap<Token, any>, reporter?: IReporter) {
    super(description);

    this.storage = storage || new WeakMap();
    this.reporter = reporter || GlobalReporter;
  }

  public seal(value: any): Token {
    var t: Token = new Token(this.description);

    this.storage.set(t, value);

    return t;
  }

  public unseal(t: Token, q: Label): any {
    if (!(t instanceof Token)) {
      this.reporter.report(q.negated().msg(t + " is not a sealed token (" + this.description + ")"));
    }
    if (this.storage.has(t)) {
      return this.storage.get(t);
    }

    this.reporter.report(q.negated().msg("Token: " + t.tyvar + " sealed by a different forall"));
    return t;
  }

  public kind(): TypeKind {
    return TypeKind.BoundTypeVariable;
  }

  public clone(reporter?: IReporter): BoundTypeVariable {
    if (reporter && reporter !== GlobalReporter) {
      throw new Error("Panic, sum types with foralls are not suported");
    }
    return new BoundTypeVariable(this.description, this.storage, reporter || this.reporter);
  }
}

class Token {
  constructor(public tyvar: string) {}
}

export class ArrayType implements IType {
  public description: string;
  public reporter: IReporter;
  public type: IType;

  constructor(type: IType, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
    this.type = type.clone(this.reporter);
    this.description = "[" + this.type.description + "]";
  }

  public kind(): TypeKind {
    return TypeKind.ArrayType;
  }

  public clone(reporter?: IReporter): ArrayType {
    return new ArrayType(this.type, reporter || this.reporter);
  }
}

export function arr(type: IType): ArrayType {
  return new ArrayType(type);
}

export class DictionaryType extends ArrayType {
  constructor(type: IType, reporter?: IReporter) {
    super(type, reporter);
    this.description = "{" + this.type.description + "}";
  }

  public kind(): TypeKind {
    return TypeKind.DictionaryType;
  }

  public clone(reporter?: IReporter): DictionaryType {
    return new DictionaryType(this.type, reporter || this.reporter);
  }
}

export function dict(type: IType): DictionaryType {
  return new DictionaryType(type);
}

export interface TypeDict {
  [id: string]: IType
}

export class ObjectType implements IType {
  public description: string;
  public properties: TypeDict;
  public reporter: IReporter;

  constructor(properties: TypeDict, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
    this.properties = Object.create(null);

    var descs: string[] = [];

    for (var key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        this.properties[key] = properties[key].clone(this.reporter);
        descs.push(key + ": " + properties[key].description);
      }
    }

    this.description = "{" + descs.join(", ") + "}";
  }

  public kind(): TypeKind {
    return TypeKind.ObjectType;
  }

  public clone(reporter?: IReporter): ObjectType {
    return new ObjectType(this.properties, reporter || this.reporter);
  }
}

export function obj(properties: TypeDict): ObjectType {
  return new ObjectType(properties);
}

// This is essentially and :P
export class HybridType implements IType {
  public description: string;
  public types: IType[] = [];
  public reporter: IReporter;

  constructor(types: IType[], reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
    this.types = types.map((type) => { return type.clone(this.reporter); });
    this.description = this.types.map((type) => { return type.description; }).join(" && ");
  }

  public kind(): TypeKind {
    return TypeKind.HybridType;
  }

  public clone(reporter?: IReporter): HybridType {
    return new HybridType(this.types, reporter || this.reporter);
  }
}

export function hybrid(...types: IType[]): HybridType {
  return new HybridType(types);
}

export class SumType implements IType {
  public description: string;
  public types: IType[] = [];
  public reporter: IReporter;

  constructor(types: IType[], reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
    this.types = types.map((type) => { return type.clone(this.reporter); });
    this.description = this.types.map((type) => { return type.description; }).join(" || ");
  }

  public kind(): TypeKind {
    return TypeKind.SumType;
  }

  public clone(reporter?: IReporter): SumType {
    return new SumType(this.types, reporter || this.reporter);
  }
}

export function sum(...types: IType[]): SumType {
  return new SumType(types);
}

export class LazyTypeCache {
  private typeCache: TypeDict;
  private requested: string[];

  constructor() {
    this.typeCache = Object.create(null);
    this.requested = [];
  }

  public get(name: string): IType {
    var resolver = () => {
      return this.typeCache[name] || Any;
    };

    this.requested.push(name);

    return new LazyType(name, resolver);
  }

  public set(name: string, type: IType): void {
    this.typeCache[name] = type;
  }

  public verify(): boolean {
    return this.requested.every((name) => {
      return Object.prototype.hasOwnProperty.call(this.typeCache, name);
    });
  }
}

export class LazyType {
  public reporter: IReporter;

  constructor(public description: string, public resolver: () => IType, reporter?: IReporter) {
    this.reporter = reporter || GlobalReporter;
  }

  public kind(): TypeKind {
    return TypeKind.LazyType;
  }

  public clone(reporter?: IReporter): LazyType {
    return new LazyType(this.description, this.resolver, reporter || this.reporter);
  }

  public resolve(): IType {
    return this.resolver().clone(this.reporter);
  }
}

export class BoundLazyType extends LazyType {
  public reporter: IReporter;

  constructor(type: LazyType, public ty: string, private new_type: IType) {
    super(type.description, type.resolver, type.reporter);
  }

  public clone(reporter?: IReporter): BoundLazyType {
    var lt: LazyType = new LazyType(this.description, this.resolver, reporter || this.reporter);
    return new BoundLazyType(lt, this.ty, this.new_type);
  }

  public resolve(): IType {
    return substitute_tyvar(this.resolver().clone(this.reporter), this.ty, this.new_type);
  }
}

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
    case TypeKind.DictionaryType:
      return substitute_tyvar_arr(<ArrayType> target, ty, new_type);

    case TypeKind.ObjectType:
      return substitute_tyvar_obj(<ObjectType> target, ty, new_type);

    case TypeKind.HybridType:
      return substitute_tyvar_hybrid(<HybridType> target, ty, new_type);

    case TypeKind.LazyType:
      return substitute_tyvar_lazy(<LazyType> target, ty, new_type);

    case TypeKind.BoundLazyType:
      return substitute_tyvar_bound_lazy(<BoundLazyType> target, ty, new_type);

    // Sum Types are not supported
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

function substitute_tyvar_hybrid(target: HybridType, ty: string, new_type: IType): HybridType {
  var new_types: IType[];
  new_types = target.types.map((type) => { return substitute_tyvar(type, ty, new_type); });

  return new HybridType(new_types);
}

function substitute_tyvar_lazy(target: LazyType, ty: string, new_type: IType): BoundLazyType {
  return new BoundLazyType(target, ty, new_type);
}

function substitute_tyvar_bound_lazy(target: BoundLazyType, ty: string, new_type: IType): IType {
  if (target.ty === ty) {
    return target;
  }

  return substitute_tyvar(target.resolve(), ty, new_type);
}


function compatible_base(A: BaseType, B: BaseType): boolean {
  return A.description === B.description;
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

function compatible_hybrid(A: HybridType, B: HybridType): boolean {
  if (A.types.length !== B.types.length) {
    return false;
  }

  for (var i = 0, n = A.types.length; i < n; i += 1) {
    if (A.types[i].kind !== B.types[i].kind) {
      return false;
    }
  }

  return true;
}

function compatible_sum(A: SumType, B: SumType): boolean {
  if (A.types.length !== B.types.length) {
    return false;
  }

  for (var i = 0, n = A.types.length; i < n; i += 1) {
    if (A.types[i].kind !== B.types[i].kind) {
      return false;
    }
  }

  return true;
}

function compatible_lazy(A: LazyType, B: LazyType): boolean {
  return A.description === B.description;
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

      case TypeKind.DictionaryType:
        // Dictionaries are also compatible
        return wrap_dict(value, p, q, <DictionaryType> A, <DictionaryType> B);

      case TypeKind.ObjectType:
        if (compatible_obj(<ObjectType> A, <ObjectType> B)) {
          return wrap_obj(value, p, q, <ObjectType> A, <ObjectType> B);
        }
        break;

      case TypeKind.HybridType:
        if (compatible_hybrid(<HybridType> A, <HybridType> B)) {
          return wrap_hybrid(value, p, q, <HybridType> A, <HybridType> B);
        }
        break;

      case TypeKind.SumType:
        if (compatible_sum(<SumType> A, <SumType> B)) {
          return wrap_sum(value, p, q, <SumType> A, <SumType> B);
        }
        break;

      case TypeKind.BoundLazyType:
      case TypeKind.LazyType:
        if (compatible_lazy(<LazyType> A, <LazyType> B)) {
          return wrap_lazy(value, p, q, <LazyType> A, <LazyType> B);
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
    A.reporter.report(p.msg("not of type " + A.description));
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
        A.reporter.report(q.msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
        // Pass through the unwrapped value
        return target.apply(thisValue, args);
      }

      if (nArgs > maxArgs && !A.restParameter) {
        A.reporter.report(q.msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
        // Pass through the unwrapped value
        return target.apply(thisValue, args);
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
        A.reporter.report(q.msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
      }

      if (nArgs > maxArgs && !A.restParameter) {
        A.reporter.report(q.msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
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


// TODO: Check if it applies to the dictionary or the receiver
function wrap_dict(value: any, p: Label, q: Label, A: DictionaryType, B: DictionaryType): any {
  var type: string = typeof value;
  if (type !== "object" && type !== "function" || !value) {
    A.reporter.report(p.msg("not of Indexable type"));
    return value;
  }

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {

      return wrap(target[name], p, q, A.type, B.type);
    },
   set: function (target: any, name: string, val: any, receiver: any): void {
     target[name] = wrap(val, q, p, B.type, A.type);
   }
  });
}

function wrap_obj(value: any, p: Label, q: Label, A: ObjectType, B: ObjectType): any {
  var type: string = typeof value;
  if (type !== "object" && type !== "function" || !value) {
    A.reporter.report(p.msg("not of type Obj"));
    return value;
  }

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

function wrap_hybrid(value: any, p: Label, q: Label, A: HybridType, B: HybridType): any {
  for (var i = 0, n = A.types.length; i < n; i += 1) {
    value = wrap(value, p, q, A.types[i], B.types[i]);
  }

  return value;
}

class SumReporter {
  private statuses: boolean[] = [];

  constructor(private parentReporter: IReporter) {
  }

  public getReporter(): IReporter {
    var i: number = this.statuses.length;

    // Create a slot for the reporter
    this.statuses.push(true);
    //console.log('create reporter ' + i);

    return {
      report: (msg) => { this.report(msg, i); }
    };
  }

  private report(msg: string, i: number): void {
    // Flag the reporter
    this.statuses[i] = false;
    //console.log(msg, i);

    // If all elements have failed, report it back to the parent
    if (!this.statuses.some((stat) => { return stat; })) {
      this.parentReporter.report(msg);
    }
  }
}

function wrap_sum(value: any, p: Label, q: Label, A: SumType, B: SumType): any {
  // When wrapping sum create a custom reporter:
  var reporter: SumReporter = new SumReporter(A.reporter);

  var types_A: IType[] = [];
  var types_B: IType[] = [];
  var i, n;

  // Sums of functional types are generated in a slightly different way
  // Generate them separately
  var isFuncType = (type) => { return type.kind() === TypeKind.FunctionType; };
  var notFuncType = (type) => { return type.kind() !== TypeKind.FunctionType; };
  var func_types_A: IType[] = A.types.filter(isFuncType);
  var func_types_B: IType[] = B.types.filter(isFuncType);

  var non_func_types_A: IType[] = A.types.filter(notFuncType);
  var non_func_types_B: IType[] = B.types.filter(notFuncType);


  for (i = 0, n = non_func_types_A.length; i < n; i += 1) {
    var newReporter: IReporter = reporter.getReporter();

    types_A.push(non_func_types_A[i].clone(newReporter));
    types_B.push(non_func_types_B[i].clone(newReporter));
  }

  // In this situation cannot reuse the code for hybrid type

  // wrapping the function types
  if (typeof value === "function") {
    var funcReporter: IReporter = reporter.getReporter();

    value = new Proxy(value, {
      apply: function (target, thisValue, args) {
        // Perform sum wrapping here
        var callReporter = new SumReporter(funcReporter);
        var call_types_A = [];
        var call_types_B = [];

        for (i = 0, n = func_types_A.length; i < n; i += 1) {
          var call_newReporter = callReporter.getReporter();

          call_types_A.push(func_types_A[i].clone(call_newReporter));
          call_types_B.push(func_types_B[i].clone(call_newReporter));
        }

        for (i = 0, n = call_types_A.length; i < n; i += 1) {
          target = wrap(target, p, q, call_types_A[i], call_types_B[i]);
        }

        return target.apply(thisValue, args);
      }
    });
  }

  for (i = 0, n = types_A.length; i < n; i += 1) {
    value = wrap(value, p, q, types_A[i], types_B[i]);
  }

  return value;
}

function wrap_lazy(value: any, p: Label, q: Label, A: LazyType, B: LazyType): any {
  return wrap(value, p, q, A.resolve(), B.resolve());
}


// vim: set ts=2 sw=2 sts=2 et :
