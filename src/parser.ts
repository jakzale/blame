// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

// Libd contents
import LibD = require("../lib/libd.js");

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

  public log(...args: any): void {
    var indent: string = (new Array(this.level)).join("  ");
    if (this.ignored) {
      indent = "--" + indent;
    } else {
      indent = "  " + indent;
    }

    console.log(indent + args.join(" "));
  }

  public raw(...args: any): void {
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
  private cache: {[id: string]: string};

  constructor() {
    this.cache = Object.create(null);
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.cache, key);
  }

  public set(key: string, val: string): void {
    this.cache[key] = val;
  }

  public get(key: string): string {
    return this.cache[key];
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

  function isBlank(s: string): boolean {
    return s.length > 0;
  }

  var nextLogger: ILogger = logger.next();
  function parseSingleDeclaration(decl: TypeScript.PullDecl): string {
    return parseDeclaration(decl, nextLogger, typeCache);
  }

  var result: string;
  // Parse each declaration, and log the results
  result = decls.map(parseSingleDeclaration)
    .filter(isBlank)
    .join("\n");

  // Clean up the compiler
  compiler.removeFile(filename);

  return result;
}

/** Parse the TypeScript Declaration */
function parseDeclaration(declaration: TypeScript.PullDecl, logger: ILogger, typeCache: TypeCache): string {
  var symbol: TypeScript.PullSymbol = declaration.getSymbol();

  var next: ILogger = logger.next();
  var ignore: ILogger = logger.next(true);

  switch (declaration.kind) {
    case TypeScript.PullElementKind.Variable:
      logger.log("declaration: variable");
      return parseSymbol(symbol, next, typeCache);

    case TypeScript.PullElementKind.Function:
      logger.log("declaration: function");
      return parseSymbol(symbol, next, typeCache);

    case TypeScript.PullElementKind.Class:
      logger.log("declaration: class");
      return parseClassDefinitionSymbol(<TypeScript.PullTypeSymbol> symbol, next, typeCache);

    case TypeScript.PullElementKind.Interface:
      logger.log("declaration: interface");
      return parseInterfaceDeclarationSymbol(<TypeScript.PullTypeSymbol> symbol, next, typeCache);


    // --- Ignored Declarations ---
    // They are present in the subsequent declarations

    case TypeScript.PullElementKind.Container:
      logger.log("declaration: module");
      parseInternalModuleDeclarationSymbol(<TypeScript.PullContainerSymbol> symbol, ignore, typeCache);
      return "";

    case TypeScript.PullElementKind.ObjectType:
      logger.log("declaration: object type -- ignored");
      parseObjectType(<TypeScript.PullTypeSymbol> symbol, ignore, typeCache);
      return "";

    case TypeScript.PullElementKind.FunctionType:
      logger.log("declaration: function type -- ignored");
      parseFunctionType(<TypeScript.PullTypeSymbol> symbol, ignore, typeCache);
      return "";

    case TypeScript.PullElementKind.Enum:
      logger.log("declaration: enum type -- ignored");
      parseEnumType(<TypeScript.PullTypeSymbol> symbol, ignore, typeCache);
      return "";

    default:
      throw new Error("Panic, Declaration: " + TypeScript.PullElementKind[declaration.kind] + " not supported");
  }
}

/** Parse the Symbol Token and return a wrapper */
function parseSymbol(symbol: TypeScript.PullSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = symbol.name;
  logger.log("symbol name: " + name);

  var type: string = parseTypeSymbol(symbol.type, logger.next(), typeCache);

  if (type && !(typeCache.has(name))) {
    logger.log("declared! " + name + ": " + type);

    return name + " = Blame.simple_wrap(" + name + ", " + type + ");";
  }

  logger.log("skipped! " + name);

  return "";
}

function parseTypeSymbol(symbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var next: ILogger = logger.next();

  switch (symbol.kind) {
    case TypeScript.PullElementKind.Primitive:
      logger.log("parse: primitive type");
      return parsePrimitiveType(symbol, next);

    case TypeScript.PullElementKind.Interface:
      logger.log("parse: interface type");
      return parseInterface(symbol, next, typeCache);

    case TypeScript.PullElementKind.FunctionType:
      logger.log("parse: function type");
      return parseFunctionType(symbol, next, typeCache);

    case TypeScript.PullElementKind.ObjectType:
      logger.log("parse: object type");
      return parseObjectType(symbol, next, typeCache);

    case TypeScript.PullElementKind.ConstructorType:
      logger.log("parse: constructor type");
      return parseConstructorType(symbol, next, typeCache);

    case TypeScript.PullElementKind.Class:
      logger.log("parse: class type");
      return parseClassSymbol(symbol, next, typeCache);

    case TypeScript.PullElementKind.Enum:
      logger.log("parse: enum type");
      return parseEnumType(symbol, next, typeCache);

    case TypeScript.PullElementKind.Container:
      logger.log("parse: module type");
      return parseObjectType(symbol, next, typeCache);

    default:
      throw Error("Panic, TypeSymbol: " + TypeScript.PullElementKind[symbol.kind] + " not supported!");
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
      return "null";

    default:
      throw Error("Panic, PrimitiveType: " + type + " not supported!");
  }
}

function parseInterface(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var type: string = typeSymbol.getDisplayName();

  logger.log("type: " + type);

  switch (type) {
    case "Array":
      return "Blame.arr(" + parseTypeSymbol(typeSymbol.getElementType(), logger.next(), typeCache) + ")";

    default:
      if (typeCache.has(type)) {
        var cached: string = typeCache.get(type);
        logger.log("load interface: " + type + " -> " + cached);

        return cached;
      }

      throw Error("Panic, Interface: " + type + " not supported!");
  }
}


function parseFunctionType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var callSignatures: TypeScript.PullSignatureSymbol[] = typeSymbol.getCallSignatures();

  if (callSignatures.length > 1) {
    throw new Error("Panic, Functions with more than one call singature not supported: " + typeSymbol.getFunctionSymbol().name);
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

      return parseTypeSymbol(symbol.type, nextNext, typeCache);
    }

    logger.log("required parameters: ");
    requiredParameters = parameters.filter(not(isRest)).filter(not(isOptional)).map(parseParameterSymbol);

    logger.log("optional parameters: ");
    optionalParameters = parameters.filter(not(isRest)).filter(isOptional).map(parseParameterSymbol);


    if (callSignature.hasVarArgs) {
      logger.log("rest parameter: ");
      var elementType: TypeScript.PullTypeSymbol = (parameters.filter(isRest)[0]).type.getElementType();
      restType = parseTypeSymbol(elementType, nextNext, typeCache);
    }

    if (callSignature.returnType) {
      logger.log("return type:");
      returnType = parseTypeSymbol(callSignature.returnType, nextNext, typeCache);
    }
  }

  var output: string = "Blame.fun([" + requiredParameters.join(", ") + "], " +
    "[" + optionalParameters.join(", ") + "], " +
    restType + ", " +
    returnType + ")";

  return output;
}

function parseMember(member: TypeScript.PullSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = member.getDisplayName();
  logger.log("member: " + name);

  var type: string = parseTypeSymbol(member.type, logger.next(), typeCache);

  return member.name + ": " + type;
}

function parseObjectType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  logger.log("object type:");

  var members: string = parseMembersOfSymbol(typeSymbol, logger.next(), typeCache);

  return "Blame.obj({" + members + "})";
}

function parseConstructorType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  logger.log("constructor: " + typeSymbol.getDisplayName() + "  -- skipped");
  return "";
}

function parseMembersOfSymbol(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var members: TypeScript.PullSymbol[] = typeSymbol.getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all);

  logger.log("members:");
  var next: ILogger = logger.next();

  function parseSingleMember(member: TypeScript.PullSymbol): string {
    return parseMember(member, next, typeCache);
  }

  return members.map(parseSingleMember).sort().join(", ");
}

function parseClassDefinitionSymbol(symbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = symbol.getDisplayName();
  var bname: string = "Blame_" + name;

  logger.log("cache class: " + name + " <- " + bname);
  logger.log("class full name: " + symbol.getTypeName());
  typeCache.set(name, bname);

  var members: string = parseMembersOfSymbol(symbol, logger.next(), typeCache);

  return "var " + bname + " = Blame.obj({" + members + "});" ;
}

function parseClassSymbol(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = typeSymbol.getDisplayName();

  if (typeCache.has(name)) {
    var cached: string = typeCache.get(name);
    logger.log("load class: " + name + " -> " + cached);
    return cached;
  }

  parseClassDefinitionSymbol(typeSymbol, logger.next(), typeCache);

  //return "";
  // TODO: Figure out how to pull a class defined somewhere else
  throw new Error("Panic, Undefined class symbol: " + name);
}

function parseInterfaceDeclarationSymbol(symbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = symbol.getDisplayName();
  var bname: string = "Blame_" + name;

  logger.log("cache interface: " + name + " <- " + bname);
  typeCache.set(name, bname);

  var members: string = parseMembersOfSymbol(symbol, logger.next(), typeCache);

  return "var " + bname + " = Blame.obj({" + members + "});" ;
}

function parseEnumType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = typeSymbol.getDisplayName();
  var bname: string = "Blame_" + name;

  logger.log("cache enum: " + name + " <- " + bname);
  typeCache.set(name, bname);

  return "";
}

function parseInternalModuleDeclarationSymbol(symbol: TypeScript.PullContainerSymbol, logger: ILogger, typeCache: TypeCache): string {
  var name: string = symbol.getDisplayName();

  logger.log("internal module: " + name);
  return parseSymbol(symbol, logger.next(), typeCache);
}


export function compileFromString(source: string, shouldLog?: boolean) {
  return compile("generated.d.ts", source, !!shouldLog);
}

// vim: set ts=2 sw=2 sts=2 et :
