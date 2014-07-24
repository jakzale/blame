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

export function compileFromString(source: string, shouldLog?: boolean) {
  call += 1;

  /* Creating a cache to hold types */
  var typeCache = Object.create(null);

  /* Helper functions */

  function log(...rest: any[]) {
    if (shouldLog) {
      console.log.apply(undefined, [call + " "].concat(rest));
    }
  }

  function parsePullDecl(declaration: TypeScript.PullDecl): string {
    switch (declaration.kind) {
      case TypeScript.PullElementKind.Variable:
        log("got variable");
        return parsePullSymbol(declaration.getSymbol());

      case TypeScript.PullElementKind.Function:
        log("got function");
        return parsePullSymbol(declaration.getSymbol());

      case TypeScript.PullElementKind.Class:
        log("got class class");
        return parseClassDefinitionSymbol(<TypeScript.PullTypeSymbol> declaration.getSymbol());

      case TypeScript.PullElementKind.Interface:
        log("got interface");
        return parseInterfaceDeclarationSymbol(<TypeScript.PullTypeSymbol> declaration.getSymbol());

        /* Ignored Declarations */

      case TypeScript.PullElementKind.ObjectType:
        log("got object type");
        return "";

      case TypeScript.PullElementKind.FunctionType:
        log("got function type");
        return "";

      case TypeScript.PullElementKind.Enum:
        log("got enum type");
        return "";

      default:
        throw new Error("Panic, Declaration: " + TypeScript.PullElementKind[declaration.kind] + " not supported");
    }
  }

  function parsePullSymbol(pullSymbol: TypeScript.PullSymbol): string {
    var name: string = pullSymbol.name;
    var type: string = parsePullTypeSymbol(pullSymbol.type);

    log(name, type);

    if (type && !(typeCache[name])) {
      return name + " = Blame.simple_wrap(" + name + ", " + type + ");";
    }

    log("skipping wrapping: " + name);

    return "";
  }

  function parsePullTypeSymbol(typeSymbol: TypeScript.PullTypeSymbol): string {
    switch (typeSymbol.kind) {
      case TypeScript.PullElementKind.Primitive:
        log("parsing primitive type");
        return parsePrimitiveType(typeSymbol);
      case TypeScript.PullElementKind.Interface:
        log("parsing interface");
        return parseInterface(typeSymbol);
      case TypeScript.PullElementKind.FunctionType:
        log("parsing function type");
        return parseFunctionType(typeSymbol);
      case TypeScript.PullElementKind.ObjectType:
        log("parsing object type");
        return parseObjectType(typeSymbol);
      case TypeScript.PullElementKind.ConstructorType:
        log("parsing constructor type");
        return parseConstructorType(typeSymbol);
      case TypeScript.PullElementKind.Class:
        log("parsing class");
        return parseClassSymbol(typeSymbol);
      case TypeScript.PullElementKind.Enum:
        log("parsing enum");
        return parseEnumType(typeSymbol);

      default:
        throw Error("Panic, TypeSymbol: " + TypeScript.PullElementKind[typeSymbol.kind] + " not supported!");
    }
  }

  function parsePrimitiveType(typeSymbol: TypeScript.PullTypeSymbol): string {
    var type: string = typeSymbol.getDisplayName();

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

  function parseInterface(typeSymbol: TypeScript.PullTypeSymbol): string {
    var type: string = typeSymbol.getDisplayName();

    switch (type) {
      case "Array":
        return "Blame.arr(" + parsePullTypeSymbol(typeSymbol.getElementType()) + ")";

      default:
        if (typeCache[type]) {
          return typeCache[type];
        }

        throw Error("Panic, Interface: " + type + " not supported!");
    }
  }

  function extractType(pullSymbol: TypeScript.PullSymbol): TypeScript.PullTypeSymbol {
    return pullSymbol.type;
  }

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

  function extractElementType(typeSymbol: TypeScript.PullTypeSymbol): TypeScript.PullTypeSymbol {
    return typeSymbol.getElementType();
  }

  function parseFunctionType(typeSymbol: TypeScript.PullTypeSymbol): string {
    var callSignatures: TypeScript.PullSignatureSymbol[] = typeSymbol.getCallSignatures();

    if (callSignatures.length > 1) {
      throw new Error("Panic, Functions with more than one call singature not supported: " + typeSymbol.getFunctionSymbol().name);
    }

    var requiredParameters: string[] = [];
    var optionalParameters: string[] = [];
    var repeatType = "null";
    var returnType = "null";


    if (callSignatures.length > 0) {
      var callSignature: TypeScript.PullSignatureSymbol = callSignatures[0];
      var parameters: TypeScript.PullSymbol[] = callSignature.parameters;

      requiredParameters = parameters.filter(not(isRest)).filter(not(isOptional)).map(extractType).map(parsePullTypeSymbol);
      optionalParameters = parameters.filter(not(isRest)).filter(isOptional).map(extractType).map(parsePullTypeSymbol);

      if (callSignature.returnType) {
        returnType = parsePullTypeSymbol(callSignature.returnType);
      }

      if (callSignature.hasVarArgs) {
        repeatType = parsePullTypeSymbol(parameters.filter(isRest).map(extractType).map(extractElementType)[0]);
      }

    }

    var output: string = "Blame.func([" + requiredParameters.join(", ") + "], " +
        "[" + optionalParameters.join(", ") + "], " +
        repeatType + ", " +
        returnType + ")";

    return output;
  }

  function parseMember(member: TypeScript.PullSymbol) {
    return member.name + ": " + parsePullTypeSymbol(extractType(member));
  }

  function parseObjectType(typeSymbol: TypeScript.PullTypeSymbol): string {
    var members: TypeScript.PullSymbol[] = typeSymbol.getMembers();
    var outMembers: string[] = members.map(parseMember);

    return "Blame.obj({" + outMembers.sort().join(", ")  + "})";
  }

  function parseConstructorType(typeSymbol: TypeScript.PullTypeSymbol): string {
    return "";
  }

  function parseClassDefinitionSymbol(symbol: TypeScript.PullTypeSymbol): string {
    var name: string = symbol.getDisplayName();
    var bname: string = "Blame_" + name;

    log("got class symbol: " + name);
    typeCache[name] = bname;

    var members: string[] = symbol.getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all).map(parseMember).sort();
    log(members);

    return "var " + bname + " = Blame.obj({" + members.join(", ") + "});" ;
  }

  function parseClassSymbol(typeSymbol: TypeScript.PullTypeSymbol): string {
    var name: string = typeSymbol.getDisplayName();

    if (typeCache[name]) {
      return typeCache[name];
    }

    // TODO: Figure out how to pull a class defined somewhere else
    throw new Error("Panic, Undefined class symbol: " + name);
  }

  function parseInterfaceDeclarationSymbol(symbol: TypeScript.PullTypeSymbol): string {
    var name: string = symbol.getDisplayName();
    var bname: string = "Blame_" + name;

    log("got class symbol: " + name);
    typeCache[name] = bname;

    var members: string[] = symbol
                              .getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all)
                              .map(parseMember)
                              .sort();
    log(members);

    return "var " + bname + " = Blame.obj({" + members.join(", ") + "});" ;
  }

  function parseEnumType(typeSymbol: TypeScript.PullTypeSymbol): string {
    var name: string = typeSymbol.getDisplayName();
    typeCache[name] = name;

    return "";
  }


  var filename: string = "generated.d.ts";
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

  var result: string = decls.map(parsePullDecl).filter(isBlank).join("\n");

  // Clean up the compiler
  compiler.removeFile(filename);

  return result;
}


// vim: set ts=2 sw=2 sts=2 et :
