// Blame

// Loading harmony reflect
if (typeof Proxy !== "function") {
  require("harmony-reflect");
}

// Counter for blame labels
var count: number = 0;

declare function Proxy(target: any, handler: {}): void;

export interface ILabel {
  dom(): ILabel;
  rng(): ILabel;
  get(): ILabel;
  set(): ILabel;
  msg(m: string): string;
  blame(m: string): void;
  l(): string;
  sum(state: any): ILabel;
}

class Path {
  private nodes: string[];
  constructor(nodes?: string[]) {
    this.nodes = nodes || [];
  }

  path(): string {
    return this.nodes.join("/");
  }

  next(node: string): Path {
    return new Path(this.nodes.concat(node));
  }
}

class LabelMap {
  branches: string[];
  constructor(branches: number) {
    this.branches = [];
    for (var i = 0; i < branches; i += 1) {
      this.branches.push("");
    }
  }

  getState(n: number): IState {
    return {
      complete: () => {
        return this.branches.every((branch) => {
          return branch && branch.length > 0;
        });
      },
      report: (m: string) => {
        if (!this.branches[n]) {
          this.branches[n] = m;
        }
      },
      msg: () => {
        return this.branches.join("\n");
      },
      id: () => {
        return n;
      }
    };
  }
}

interface IState {
  complete(): boolean;
  report(m: string): void;
  msg(): string;
  id(): number;
}

// Extend labels to support unions
class Label implements ILabel {
  private label: string;
  private path: Path;
  private state: IState;

  constructor(label?: string, path?: Path, state?: IState) {

    if (label !== undefined) {
      this.label = String(label);
    } else {
      this.label = "label_" + count;
      count += 1;
    }

    this.path = path || new Path();
    this.state = state || null;
  }

  private next(path: string): ILabel {
    return new Label(this.label, this.path.next(path), this.state);
  }

  public dom(): ILabel {
    return this.next("dom");
  }

  public rng(): ILabel {
    return this.next("rng");
  }

  public set(): ILabel {
    return this.next("set");
  }

  public get(): ILabel {
    return this.next("get");
  }

  public sum(state: IState): ILabel {
    return new Label(this.label, this.path.next("sum#" + state.id()), state);
  }

  public msg(m: string): string {
    var message: string = "";

    if (m) {
      message = " " + m;
    }

    return "{" + this.label + "}[" + this.path.path() + "]" + message;
  }

  public blame(m: string): void {
    if (this.state) {
      this.state.report(this.msg(m));

      if (this.state.complete()) {
        throw new Error(this.state.msg());
      }
    } else {
      throw new Error(this.msg(m));
    }
  }

  public l(): string {
    return this.label;
  }
}



export function label(lab?: string): ILabel {
  return new Label(lab);
}

function poppableLabel(front: ILabel, back: ILabel): ILabel {
  var notPopped = true;

  return new Proxy(back, {
    get: function (target, name, receiver): any {
      if (notPopped) {
        if (name === "pop") {
          return function () {
            notPopped = false;
          };
        }
        return front[name];
      }

      return target[name];
    }
  });
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
  LazyType,
  BoundLazyType,
  UnionType
}

export interface IType {
  description: string;
  kind(): TypeKind;
}

export class BaseType implements IType {

  constructor(public description: string, public contract: (any) => boolean) {
  }

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
export var Obj = new BaseType("Obj", function (value: any): boolean {
  return typeof value === "object";
});

export var Fun = new BaseType("Fun", function (value: any): boolean {
  return typeof value === "function";
});


export var Null = new BaseType("Fun", function (value: any): boolean {
  return typeof value === "undefined" || value === null;
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

    this.restParameter = null;
    if (restParameter) {
      this.restParameter = restParameter;
    }

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

    this.description = descs.join(" -> ");

    if (this.constructType !== Any) {
    this.description += "  C:" + this.constructType.description;
    }
  }

  public kind(): TypeKind {
    return TypeKind.FunctionType;
  }
}

export function fun(range: IType[], optional: IType[], rest: IType, ret: IType, cons: IType): FunctionType {
  return new FunctionType(range, optional, rest, ret, cons);
}

export function func(...args: IType[]) {
  if (args.length < 0) {
    throw new Error("Panic, Func needs at least one argument");
  }

  var returnType: IType = args.pop();

  return new FunctionType(args, [], null, returnType, null);
}

export class ForallType implements IType {

  public type: IType;

  public description: string;

  constructor(public tyvar: string, type: IType) {

    //switch (type.kind()) {
    //  case TypeKind.FunctionType:
    //  case TypeKind.ForallType:
    //    break;

    //  default:
    //    throw new Error("Panic, type " + type.description + " not supported for forall");
    //}

    this.type = type;

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
  public storage: WeakMap<Token, any>;

  constructor(description: string, storage?: WeakMap<Token, any>) {
    super(description);

    this.storage = storage || new WeakMap();
  }

  public seal(value: any): Token {
    var t: Token = new Token(this.description);

    this.storage.set(t, value);

    return t;
  }

  public unseal(t: Token, p: ILabel): any {
    if (!(t instanceof Token)) {
      throw new Error(p.msg(t + " is not a sealed token (" + this.description + ")"));
    }
    if (this.storage.has(t)) {
      return this.storage.get(t);
    }

    throw new Error(p.msg("Token: " + t.tyvar + " sealed by a different forall"));
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
  public type: IType;

  constructor(type: IType) {
    this.type = type;
    this.description = "[" + this.type.description + "]";
  }

  public kind(): TypeKind {
    return TypeKind.ArrayType;
  }
}

export function arr(type: IType): ArrayType {
  return new ArrayType(type);
}

export class DictionaryType extends ArrayType {
  constructor(type: IType) {
    super(type);
    this.description = "{" + this.type.description + "}";
  }

  public kind(): TypeKind {
    return TypeKind.DictionaryType;
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

  constructor(properties: TypeDict) {
    this.properties = Object.create(null);

    var descs: string[] = [];

    for (var key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        this.properties[key] = properties[key];
        descs.push(key + ": " + properties[key].description);
      }
    }

    this.description = "{" + descs.join(", ") + "}";
  }

  public kind(): TypeKind {
    return TypeKind.ObjectType;
  }
}

export function obj(properties: TypeDict): ObjectType {
  return new ObjectType(properties);
}

// This is essentially and :P
export class HybridType implements IType {
  public description: string;
  public types: IType[] = [];

  constructor(types: IType[]) {
    this.types = types.map((type) => { return type; });
    this.description = this.types.map((type) => { return type.description; }).join(" && ");
  }

  public kind(): TypeKind {
    return TypeKind.HybridType;
  }
}

export function hybrid(...types: IType[]): HybridType {
  return new HybridType(types);
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

  constructor(public description: string, public resolver: () => IType) {
  }

  public kind(): TypeKind {
    return TypeKind.LazyType;
  }

  public resolve(): IType {
    return this.resolver();
  }
}

export class BoundLazyType extends LazyType {
  private tys: string[];
  private new_types: IType[];

  constructor(type: LazyType) {
    super(type.description, type.resolver);
    this.tys = [];
    this.new_types = [];
  }

  public add(ty: string, new_type: IType): void {
    this.tys.push(ty);
    this.new_types.push(new_type);
  }

  public resolve(): IType {
    var resolved = this.resolver();

    this.tys.forEach((ty, i) => {
      resolved = substitute_tyvar(resolved, ty, this.new_types[i]);
    });

    return resolved;
  }

  public hasTy(ty: string): boolean {
    return this.tys.some((myTy) => {
      return ty === myTy;
    });
  }
}


export class UnionType implements IType {
  public description: string;
  public types: IType[] = [];

  constructor(types: IType[]) {
    this.types = types.map((type) => { return type; });
    this.description = this.types.map((type) => { return type.description; }).join(" + ");
  }

  public kind(): TypeKind {
    return TypeKind.UnionType;
  }
}

export function union(...types: IType[]): UnionType {
  return new UnionType(types);
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
  var blt: BoundLazyType = new BoundLazyType(target);
  blt.add(ty, new_type);

  return blt;
}

function substitute_tyvar_bound_lazy(target: BoundLazyType, ty: string, new_type: IType): IType {
  if (target.hasTy(ty)) {
    return target;
  }
  target.add(ty, new_type);

  return target;
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

  return true;
}


function compatible_lazy(A: LazyType, B: LazyType): boolean {
  return A.description === B.description;
}

function compatible_union(A: UnionType, B: UnionType): boolean {
  if (A.types.length !== B.types.length) {
    return false;
  }

  return true;
}

export function simple_wrap(value: any, A: IType): any {
  var p = new Label();

  return wrap(value, p, p, A, A);
}

export function wrap(value: any, p: ILabel, q: ILabel, A: IType, B: IType): any {
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


      case TypeKind.UnionType:
        if (compatible_union(<UnionType> A, <UnionType> B)) {
          return wrap_union(value, p, q, <UnionType> A, <UnionType> B);
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
    return (<BoundTypeVariable> A).unseal(value, p);
  }

  throw new Error("Panic, A: " + A.description + " and B: " + B.description + " are not compatible");
}

function wrap_base(value: any, p: ILabel, A: BaseType): any {
  if (!A.contract(value)) {
    //throw new Error(p.msg("not of type " + A.description + ": " + value));
    p.blame("not of type " + A.description + ": " + value);
  }

  return value;
}

function wrap_fun(value: any, p: ILabel, q: ILabel, A: FunctionType, B: FunctionType) {
  // Checking if value is a function
  value = wrap_base(value, p, Fun);

  return new Proxy(value, {
    apply: function (target: any, thisValue: any, args: any[]): any {
      var nArgs: number = args.length;
      var minArgs: number = A.requiredParameters.length;
      var maxArgs: number = (A.requiredParameters.length + A.optionalParameters.length);

      if (nArgs < minArgs) {
        //throw new Error(q.dom().msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
        // Pass through the unwrapped value
        q.dom().blame("not enough arguments, expected >=" + minArgs + ", got: " + nArgs);
        return target.apply(thisValue, args);
      }

      if (nArgs > maxArgs && !A.restParameter) {
        //throw new Error(q.dom().msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
        // Pass through the unwrapped value
        q.dom().blame("too many arguments, expected <=" + maxArgs + ", got: " + nArgs);
        return target.apply(thisValue, args);
      }

      var wrapped_args: any[] = [];

      for (var i = 0; i < A.requiredParameters.length; i++) {
        wrapped_args.push(wrap(args[i], q.dom(), p.dom(), B.requiredParameters[i], A.requiredParameters[i]));
      }

      for (var j = 0; j < A.optionalParameters.length && (i + j) < args.length; j++) {
        wrapped_args.push(wrap(args[i + j], q.dom(), p.dom(), B.optionalParameters[j], A.optionalParameters[j]));
      }

      for (var k = i + j; k < args.length; k++) {
        wrapped_args.push(wrap(args[k], q.dom(), p.dom(), B.restParameter, A.restParameter));
      }

      var ret = target.apply(thisValue, wrapped_args);

      return wrap(ret, p.rng(), q.rng(), A.returnType, B.returnType);
    },
    construct: function (target: any, args: any[]): any {
      var nArgs: number = args.length;
      var minArgs: number = A.requiredParameters.length;
      var maxArgs: number = (A.requiredParameters.length + A.optionalParameters.length);

      // Create the instance
      var instance = Object.create(target.prototype);

      if (nArgs < minArgs) {
        //throw new Error(q.dom().msg("not enough arguments, expected >=" + minArgs + ", got: " + nArgs));
        q.dom().blame("not enough arguments, expected >=" + minArgs + ", got: " + nArgs);
        target.apply(instance, args);
        return instance;
      }

      if (nArgs > maxArgs && !A.restParameter) {
        //throw new Error (q.dom().msg("too many arguments, expected <=" + maxArgs + ", got: " + nArgs));
        q.dom().blame("too many arguments, expected <=" + maxArgs + ", got: " + nArgs);
        target.apply(instance, args);
        return instance;
      }

      var wrapped_args: any[] = [];

      for (var i = 0; i < A.requiredParameters.length; i++) {
        wrapped_args.push(wrap(args[i], q.dom(), p.dom(), B.requiredParameters[i], A.requiredParameters[i]));
      }

      for (var j = 0; j < A.optionalParameters.length && (i + j) < args.length; j++) {
        wrapped_args.push(wrap(args[i + j], q.dom(), p.dom(), B.optionalParameters[j], A.optionalParameters[j]));
      }

      for (var k = i + j; k < args.length; k++) {
        wrapped_args.push(wrap(args[k], q.dom(), p.dom(), B.restParameter, A.restParameter));
      }


      // Create wrapped instance for the constructor;
      var q_p: any = poppableLabel(q, p);
      var p_q: any = poppableLabel(p, q);

      // Eager constructor enforcement
      var cons_instance = wrap(instance, <ILabel> q_p, <ILabel> p_q, A.constructType, B.constructType);

      target.apply(cons_instance, wrapped_args);


      // Swapping the labels
      q_p.pop();
      p_q.pop();

      // Returning wrapped instance for the rest of the program
      return cons_instance;
    }
  });
}

function wrap_forall(value: any, p: ILabel, q: ILabel, A: ForallType, B: ForallType): any {
  //value = wrap_base(value, p, Fun);

  function fresh_wrap(value: any): any {
    var XX = new BoundTypeVariable(A.tyvar + "'");

    var A_XX: IType = substitute_tyvar(A.type, A.tyvar, XX);
    var B_prim: IType = substitute_tyvar(B.type, B.tyvar, Any);

    return wrap(value, p, q, A_XX, B_prim);
  }

  if (typeof value !== "function") {
    return fresh_wrap(value);
  }

  return new Proxy(value, {
    apply: function (target: any, thisValue: any, args: any[]): any {

      var wrapped_fun = fresh_wrap(target);

      return wrapped_fun.apply(thisValue, args);
    }
  });
}

function is_index(value: string): boolean {
  // Bitwise necessary for checking if the number is array index
  var index = Number(value) >>> 0;
  return value === index.toString() && index !== (-1 >>> 0);
}

function wrap_arr(value: any, p: ILabel, q: ILabel, A: ArrayType, B: ArrayType): any {
  value = wrap_base(value, p, Arr);

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {

      if (is_index(name)) {
        return wrap(target[name], p.get(), q.get(), A.type, B.type);
      }

      return target[name];
    },
   set: function (target: any, name: string, val: any, receiver: any): void {
     if (is_index(name)) {
       target[name] = wrap(val, q.set(), p.set(), B.type, A.type);

       return;
     }

     target[name] = val;
   }

  });
}


// TODO: Check if it applies to the dictionary or the receiver
function wrap_dict(value: any, p: ILabel, q: ILabel, A: DictionaryType, B: DictionaryType): any {
  var type: string = typeof value;
  if (type !== "object" && type !== "function" || !value) {
    //throw new Error(p.msg("not of Indexable type"));
    p.blame("not of Indexable type");
    return value;
  }

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {

      return wrap(target[name], p.get(), q.get(), A.type, B.type);
    },
   set: function (target: any, name: string, val: any, receiver: any): void {
     target[name] = wrap(val, q.set(), p.set(), B.type, A.type);
   }
  });
}

function wrap_obj(value: any, p: ILabel, q: ILabel, A: ObjectType, B: ObjectType): any {
  var type: string = typeof value;

  if (type !== "object" && type !== "function") {
    //throw new Error(p.msg("not of type Obj"));
    p.blame("not of type Obj: " + value);
    return value;
  }

  // TODO: Not sure if good..
  if (!value) {
    return value;
  }

  return new Proxy(value, {
    get: function (target: any, name: string, receiver: any): any {
      if (Object.prototype.hasOwnProperty.call(A.properties, name)) {
        var A_type: IType = A.properties[name];
        var B_type: IType = B.properties[name];

        return wrap(target[name], p.get(), q.get(), A_type, B_type);
      }

      return target[name];
    },
    set: function (target: any, name: string, val: any, receiver: any): void {
      if (Object.prototype.hasOwnProperty.call(A.properties, name)) {
        var A_type: IType = A.properties[name];
        var B_type: IType = B.properties[name];

        target[name] = wrap(val, q.set(), p.set(), B_type, A_type);
        return;
      }

      target[name] = val;
    }
  });
}

function wrap_hybrid(value: any, p: ILabel, q: ILabel, A: HybridType, B: HybridType): any {
  return A.types.reduce((value, type, i) => {
    return wrap(value, p, q, A.types[i], B.types[i]);
  }, value);
}

function wrap_lazy(value: any, p: ILabel, q: ILabel, A: LazyType, B: LazyType): any {
  return wrap(value, p, q, A.resolve(), B.resolve());
}

function wrap_union(value: any, p: ILabel, q: ILabel, A: UnionType, B: UnionType): any {

  function wrap_union_single(value): any {
    var map: LabelMap = new LabelMap(A.types.length);
    return A.types.reduce((value, type, i) => {
      var state = map.getState(i);
      return wrap(value, p.sum(state), q.sum(state), A.types[i], B.types[i]);
    }, value);
  }

  if (typeof value === "function") {
    // Perform the wrapping once
    wrap_union_single(value);

    // Return a Proxy that will wrap per each function application
    return new Proxy(value, {
      apply: function (target, thisArg, args) {
        var wrapped = wrap_union_single(target);

        return wrapped.apply(thisArg, args);
      }
    });
  }

  return wrap_union_single(value);
}



// vim: set ts=2 sw=2 sts=2 et :
