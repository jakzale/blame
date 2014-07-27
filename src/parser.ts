// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

// Libd contents
declare var LibD: string;

// Declaring the compiler as static

var compiler: TypeScript.TypeScriptCompiler = null;
var logger: TypeScript.ILogger = new TypeScript.NullLogger();
var settings: TypeScript.CompilationSettings = new TypeScript.CompilationSettings();

// hardcoding this for now;
settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;

compiler = new TypeScript.TypeScriptCompiler(logger,
    TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

var libdSnapsthot = TypeScript.ScriptSnapshot.fromString(LibD);
compiler.addFile("lib.d.ts", libdSnapsthot, TypeScript.ByteOrderMark.Utf8, 0, false);

var call: number = 0;

// TODO clear up this parser
// TODO fix the parser structure


function get_diagnostic_message(diagnostics: TypeScript.Diagnostic[]): string {
  var messages: string[] = [];

  if (diagnostics.length) {

    for (var i = 0, n = diagnostics.length; i < n; i++) {
      messages.push(diagnostics[i].message());
    }

    return(messages.join("\n"));
  }

  return "";
}

interface ILogger {
  log(...args: any[]): void;
  raw(...args: any[]): void;
  next(ignored?: boolean): ILogger;
}

class NullLogger {
  log(...args: any[]): void {
    return;
  }

  raw(...args: any[]): void {
    return;
  }

  next(ignored?: boolean): ILogger {
    return this;
  }
}

class Logger {
  private level: number;
  private ignored: boolean;

  constructor(level: number = 1, ignored: boolean = false) {
    this.level = level;
    this.ignored = ignored;
  }

  public log(...args: any[]): void {
    var indent: string = (new Array(this.level)).join("  ");
    if (this.ignored) {
      indent = "--" + indent;
    } else {
      indent = "  " + indent;
    }

    console.log(indent + args.join(" "));
  }

  public raw(...args: any[]): void {
    this.log("-- RAW --");
    console.log.apply(console, args);
    this.log("-- END --");
  }

  public next(ignored?: boolean): ILogger {
    ignored = !!ignored;

    if (this.ignored) {
      ignored = true;
    }

    return new Logger(this.level + 1, ignored);
  }
}

// A simple type cache
class TypeCache {
  private defined: {[id: string]: string};
  private requested: string[];
  private notEmpty_: boolean;
  private declarations: string[];

  constructor() {
    this.defined = Object.create(null);
    this.requested = [];
    this.notEmpty_ = false;
    this.declarations = [];
  }


  public add(key: string): string {
    var val: string = to_bname(key);

    this.notEmpty_ = true;

    this.defined[key] = val;
    return val;
  }

  public get(key: string): string {
    this.requested.push(key);

    return to_bname(key);
  }

  public notEmpty(): boolean {
    return this.notEmpty_;
  }

  public getBindings(): string {
    var bindings: string[] = [];

    var that = this;
    this.requested.forEach(function (key: string): void {
      if (!Object.prototype.hasOwnProperty.call(that.defined, key)) {
        throw new Error("Panic, type: " + key + ", was never defined");
      }
    });

    for (var key in this.defined) {
      if (Object.prototype.hasOwnProperty.call(this.defined, key)) {
        bindings.push(this.defined[key]);
      }
    }

    return "var " + bindings.sort().join(", ") + ";";
  }

  public addGlobalDeclaration(identifier: string, type: string): void {
    var declaration: string = identifier + " = Blame.simple_wrap(" + identifier + ", " + type + ");";
    this.declarations.push(declaration);
  }

  public addTypeDeclaration(identifier: string, type: string): void {
    var declaration: string = identifier + " = " + type + ";";
    this.declarations.push(declaration);
  }

  public generateDeclarations(): string {
    var variables: string = "";
    if (this.notEmpty()) {
      variables = this.getBindings() + "\n";
    }

    return variables + this.declarations.join("\n");
  }
}

// -----------------------------
//  Some helper functions
// -----------------------------

function isOptional(pullSymbol: TypeScript.PullSymbol): boolean {
  return pullSymbol.isOptional;
}

function not<T>(fun: (T) => boolean): (T) => boolean {
  return  function(x: T) {
    return !(fun(x));
  };
}

function isRest(pullSymbol: TypeScript.PullSymbol): boolean {
  return pullSymbol.isVarArg;
}

function notBlank(s: string): boolean {
  return s.length > 0;
}


/*

# Declaration Parser Structure

There are 3 types of declarations to emit:
* global declaration
* type declaration
* external module declaration

## Global declaration structure

Global declarations wrap over global objects.
The general form:

  identifier = Blame.simple_wrap(identifier, type)
where identifier is the name of the symbol (variable or function) and type is the computed type.

The global declarations are present for internal modules as well.

## Type declaration structure

Type declaration defines types for classes and interfaces

## Module declaration structure

Module declarations wrap over external modules, which are imported using the require syntax:

  var module = require('module-name')

The general form for external module declaration:

  M['module-name'] = Blame.obj(members)
where members is the dictionary of module members


*/

// New ParseDeclaration

// TODO:
// I am too tired to figure this one out:!
// There are two places where you will be using parseType
// TODO: You need to make a distinction when you are defining the type,
//       and when you are just retrieving the type

function parseDeclaration2(declaration: TypeScript.PullDecl, logger: ILogger, typeCache: TypeCache): void {
  var symbol: TypeScript.PullSymbol = declaration.getSymbol();
  var kind: string = TypeScript.PullElementKind[declaration.kind];

  var next: ILogger = logger.next();
  var ignore: ILogger;

  switch (declaration.kind) {
    case TypeScript.PullElementKind.Variable:
    case TypeScript.PullElementKind.Function:
      logger.log("global declaration: " + kind);
      parseGlobalSymbol(symbol, next, typeCache);
      break;

    case TypeScript.PullElementKind.Class:
    case TypeScript.PullElementKind.Interface:
    case TypeScript.PullElementKind.Container:
      logger.log("type declaration: " + kind);
      parseTypeDeclarationSymbol(<TypeScript.PullTypeSymbol> symbol, next, typeCache, true);
      break;

    case TypeScript.PullElementKind.ObjectType:
    case TypeScript.PullElementKind.FunctionType:
    case TypeScript.PullElementKind.Enum:
      logger.log("ignored declaration: " + kind);
      ignore = logger.next(true);
      parseTypeDeclarationSymbol(<TypeScript.PullTypeSymbol> symbol, ignore, typeCache, false);
      break;

    default:
      throw new Error("Panic, Declaration: " + kind + " not supported");
  }
}

function parseGlobalSymbol(symbol: TypeScript.PullSymbol, logger: ILogger, typeCache: TypeCache): void {
  var name: string = symbol.getDisplayName();
  logger.log("symbol name: " + name);

  var type: string = parseType(symbol.type, logger.next(), typeCache);

  // Checking if the type is not ignored:
  if (type) {
    logger.log("declared! " + name + ": " + type);

    typeCache.addGlobalDeclaration(name, type);
    return;
  }

  // Reporting skipped type declaration
  logger.log("skipped! " + name);
}

function to_bname(name: string): string {
  return "Blame_" + name.replace("_", "__").replace(".", "_");
}

function parseTypeDeclarationSymbol(type: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache, shouldCache: boolean): void {
  var name: string = type.getTypeName();
  logger.log("type name: " + name);

  var declaration: string = parseType(type, logger.next(), typeCache, true);

  if (declaration && type.isNamedTypeSymbol()) {
    if (shouldCache) {
      var bname: string = typeCache.add(name);
      logger.log("cached type: " + name + " <- " + bname);
    }
  // Declaring the type for the first time
    logger.log("declared! " + bname + ": " + declaration);

    typeCache.addTypeDeclaration(bname, declaration);
  }
}


function parseType(type: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache, declaration?: boolean) {
  var next: ILogger = logger.next();
  var kind: string = TypeScript.PullElementKind[type.kind];

  switch (type.kind) {
    case TypeScript.PullElementKind.Primitive:
      logger.log("primitive type: ");
      return parsePrimitiveType(type, next);

    case TypeScript.PullElementKind.FunctionType:
    case TypeScript.PullElementKind.ConstructorType:
      logger.log("function-like type: " + kind);
      return parseFunctionLikeType(type, next, typeCache);

    case TypeScript.PullElementKind.ObjectType:
    case TypeScript.PullElementKind.Class:
    case TypeScript.PullElementKind.Interface:
    case TypeScript.PullElementKind.Container:
      logger.log("object-like type: " + kind);
      return parseObjectLikeType(type, next, typeCache, declaration);

    // Enums Are ignored
    case TypeScript.PullElementKind.Enum:
      logger.log("ignored type: " + kind);
      var ignored = logger.next(true);
      // Forcing the declaration mode, to prevent using the typeCache
      parseObjectLikeType(type, ignored, typeCache, true);
      return "";


    default:
      throw Error("Panic, TypeSymbol: " + kind + " not supported!");
  }
}

function parsePrimitiveType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger): string {
  var type: string = typeSymbol.getDisplayName();

  logger.log("type: " + type);

  switch (type) {
    case "number":
      return "Blame.Num";
    case "boolean":
      return "Blame.Bool";
    case "string":
      return "Blame.Str";
    case "any":
      return "Blame.Any";
    case "void":
      return "Blame.Void";

    default:
      throw Error("Panic, PrimitiveType: " + type + " not supported!");
  }
}

function parseFunctionLikeType(type: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var callSignatures: TypeScript.PullSignatureSymbol[];

  // Checking if this is a constructor
  if (type.isConstructor()) {
    callSignatures = type.getConstructSignatures();
  } else {
    callSignatures = type.getCallSignatures();
  }

  if (callSignatures.length > 1) {
    throw new Error("Panic, Functions with more than one call singature not supported: " + type.getFunctionSymbol().name);
  }

  var requiredParameters: string[] = [];
  var optionalParameters: string[] = [];
  var restType: string = "null";
  var returnType: string = "null";

  logger.log("call signatures: ", callSignatures.length);

  if (callSignatures.length > 0) {

    var next: ILogger = logger.next();
    var nextNext: ILogger = next.next();

    var callSignature: TypeScript.PullSignatureSymbol = callSignatures[0];
    var parameters: TypeScript.PullSymbol[] = callSignature.parameters;

    function parseParameterSymbol(symbol: TypeScript.PullSymbol): string {
      next.log("parameter: " + symbol.getDisplayName());

      return parseType(symbol.type, nextNext, typeCache);
    }

    logger.log("required parameters: ");
    requiredParameters = parameters.filter(not(isRest)).filter(not(isOptional)).map(parseParameterSymbol);

    logger.log("optional parameters: ");
    optionalParameters = parameters.filter(not(isRest)).filter(isOptional).map(parseParameterSymbol);


    if (callSignature.hasVarArgs) {
      logger.log("rest parameter: ");
      var elementType: TypeScript.PullTypeSymbol = (parameters.filter(isRest)[0]).type.getElementType();
      restType = parseType(elementType, nextNext, typeCache);
    }

    if (callSignature.returnType) {
      logger.log("return type:");
      returnType = parseType(callSignature.returnType, nextNext, typeCache);
    }
  }

  var output: string = "Blame.fun([" + requiredParameters.join(", ") + "], " +
    "[" + optionalParameters.join(", ") + "], " +
    restType + ", " +
    returnType + ")";

  return output;
}

function parseObjectLikeType(type: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache, declaration?: boolean): string {
  var name: string = type.getDisplayName();
  var next: ILogger = logger.next();

  logger.log("object type: " + name);

  // If it is an array:
  if (name === "Array") {
    logger.log("element type: ");
    return "Blame.arr(" + parseType(type.getElementType(), next, typeCache) + ")";
  }

  if (!declaration && type.isNamedTypeSymbol()) {
    var bname: string = typeCache.get(name);
    logger.log("load type: " + name + " -> " + bname);
    return bname;
  }

  var members: string = parseTypeMembers(type, next, typeCache);

  // If it is a container, empty members means no code
  if (type.isContainer() && !members) {
    logger.log("skipping empty container type");
    return "";
  }

  return "Blame.obj({" + members + "})";
}

function parseTypeMembers(type: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var members: TypeScript.PullSymbol[] = type.getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all);

  logger.log("members:");
  var next: ILogger = logger.next();

  function parseSingleMember(member: TypeScript.PullSymbol): string {
    return parseMember(member, next, typeCache);
  }

  return members.map(parseSingleMember).filter(notBlank).sort().join(", ");
}

function parseMember(member: TypeScript.PullSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = member.getDisplayName();
  logger.log("member: " + name);

  var type: string = parseType(member.type, logger.next(), typeCache);

  if (type) {
    return member.name + ": " + type;
  }

  logger.log("skipped member! " + name);
  return "";
}

export function compile(filename: string, source: string, shouldLog?: boolean): string {
  var logger: ILogger;
  if (shouldLog) {
    logger = new Logger();
  } else {
    logger = new NullLogger();
  }

  logger.log("parsing file: ", filename);

  var typeCache = new TypeCache();

  // Create a simple source unit
  var snapshot = TypeScript.ScriptSnapshot.fromString(source);

  // Adding the lib.d file
  compiler.addFile(filename, snapshot, TypeScript.ByteOrderMark.Utf8, 0, false);

  // Getting diagnostics, throw an error on diagnostic
  var message : string;
  var diagnostics: TypeScript.Diagnostic[] = compiler.getSyntacticDiagnostics(filename);

  message = get_diagnostic_message(diagnostics);
  if (message) {
    compiler.removeFile(filename);
    throw new Error(message);
  }

  // I am unsure if declaration file can cause semantic diagnostic
  // This will trigger the type resolver
  diagnostics = compiler.getSemanticDiagnostics(filename);
  message = get_diagnostic_message(diagnostics);
  if (message) {
    throw new Error(message);
  }

  var decl: TypeScript.PullDecl = compiler.topLevelDecl(filename);
  var decls = decl.getChildDecls();


  var nextLogger: ILogger = logger.next();
  function parseSingleDeclaration(decl: TypeScript.PullDecl): void {
    parseDeclaration2(decl, nextLogger, typeCache);
  }

  // TypeDeclarations
  decls.forEach(parseSingleDeclaration);

  // Clean up the compiler
  compiler.removeFile(filename);

  return typeCache.generateDeclarations();
}

export function compileFromString(source: string, shouldLog?: boolean) {
  return compile("generated.d.ts", source, !!shouldLog);
}



// vim: set ts=2 sw=2 sts=2 et :
