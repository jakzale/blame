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
  private declarations: string[];
  private symbols: {[id: string]: boolean};
  private types: {[id: string]: boolean};
  private modules: {[id: string]: boolean};
  private node: boolean;

  constructor(node?: boolean) {
    this.declarations = [];
    this.symbols = Object.create(null);
    this.types = Object.create(null);
    this.modules = Object.create(null);
    this.node = !!node;
  }

  public addGlobalDeclaration(identifier: string, type: string): void {
    var declaration: string = identifier + " = Blame.simple_wrap(" + identifier + ", " + type + ");";
    if (!this.node) {
      // Because those symbols might not be visible
      this.declarations.push(declaration);
    }
    this.symbols[identifier] = true;
  }

  public addTypeDeclaration(name: string, type: string): void {
    if (!this.isTypeDeclared(name)) {
      var declaration: string = "T.set('" + name + "', " + type + ");";
      this.declarations.push(declaration);
      this.types[name] = true;
    }
  }

  public addModuleDeclaration(name: string, type: string): void {
    var declaration: string;
    if (this.node) {
      declaration = "module.exports = exports = Blame.simple_wrap(module.exports, " + type + ");";
    } else {
      declaration = "M[" + name + "] = " + type + ";";
    }

    this.declarations.push(declaration);
    this.modules[name] = true;
  }

  public generateDeclarations(): string {
    return this.declarations.join("\n");
  }

  public isDeclared(identifier: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.symbols, identifier);
  }

  public isTypeDeclared(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.types, name);
  }

  public isModuleDeclared(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.modules, name);
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


class BlameCompiler {
  private typeCache: TypeCache;

  constructor(private filename: string, node?: boolean) {
    this.typeCache = new TypeCache(node);
  }

  public generateDeclarations(): string {
    return this.typeCache.generateDeclarations();
  }

  public parseDeclaration(declaration: TypeScript.PullDecl, logger: ILogger): void {
    var symbol: TypeScript.PullSymbol = declaration.getSymbol();
    var kind: string = TypeScript.PullElementKind[declaration.kind];

    var next: ILogger = logger.next();
    var ignore: ILogger;

    switch (declaration.kind) {
      case TypeScript.PullElementKind.Variable:
      case TypeScript.PullElementKind.Function:
        logger.log("global declaration: " + kind);
        this.parseGlobalSymbol(symbol, next);
        break;

      case TypeScript.PullElementKind.Class:
      case TypeScript.PullElementKind.Interface:
      case TypeScript.PullElementKind.Container:
      case TypeScript.PullElementKind.Enum:
        logger.log("type declaration: " + kind);
        this.parseTypeDeclarationSymbol(<TypeScript.PullTypeSymbol> symbol, next);
        break;

      case TypeScript.PullElementKind.ObjectType:
      case TypeScript.PullElementKind.FunctionType:
        logger.log("ignored declaration: " + kind);
        break;

      case TypeScript.PullElementKind.DynamicModule:
        logger.log("dynamic module:");
        this.parseAliasedModule(<TypeScript.PullContainerSymbol> symbol, next);
        break;

      default:
        throw new Error("Panic, Declaration: " + kind + " not supported");
    }
  }

  private parseGlobalSymbol(symbol: TypeScript.PullSymbol, logger: ILogger): void {
    var name: string = symbol.getDisplayName();
    logger.log("symbol name: " + name);


    // Check if symbol is already declared
    if (this.typeCache.isDeclared(name)) {
      logger.log("skipping already declared symbol");
      return;
    }

    var type: string = this.parseType(symbol.type, logger.next());

    // Checking if this is an external module, hack solution, but should work
    if (name.indexOf("\"") > -1 || name.indexOf("'") > -1) {
      if (!this.typeCache.isModuleDeclared(name)) {
        this.typeCache.addModuleDeclaration(name, type);
      } else {
        logger.log("skipping module declaration! " + name);
      }
      return;
    }


    // Checking if the type is not ignored:
    if (type) {
      logger.log("declared! " + name + ": " + type);

      this.typeCache.addGlobalDeclaration(name, type);
      return;
    }

    // Reporting skipped type declaration
    logger.log("skipped! " + name);
  }


  private parseTypeDeclarationSymbol(type: TypeScript.PullTypeSymbol, logger: ILogger): string {

    if (!type.isNamedTypeSymbol()) {
      // Do nothing and return -- technically this should not happen
      logger.log("skipping not a named symbol");
      return "";
    }


    var name: string = type.getTypeName();
    logger.log("type name: " + name);


    // Parsing Members
    var parsedMembers: string[] = [];
    var members: TypeScript.PullSymbol[] = type.getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all);
    var next: ILogger = logger.next();

    if (members.length > 0) {
      logger.log("parsing members: ");
      var nNext: ILogger = next.next();

      members.forEach((member) => {

        // there are two possible types of members
        var memberName: string = member.getDisplayName();
        var memberType: string;

        if (member.isType()) {
          next.log("type member: " + memberName);
          memberType = this.parseTypeDeclarationSymbol(<TypeScript.PullTypeSymbol> member, nNext);
        } else {
          next.log("non-type member: " + memberName);
          memberType = this.parseType(member.type, nNext);
        }

        if (memberType) {
          var declaration: string = memberName + ": " + memberType;
          next.log("declare member! " + declaration);
          parsedMembers.push(declaration);
        }

      });
    }
    if (type.isContainer()) {

      // WARNING!
      // The container itself should not generate any code

      logger.log("skipping container");
      return "";
    }

    // Parsing the actual type:
    var declaration: string;

    // Add declaration without checking the cache first
    declaration = this.parseSomeType(type, logger, true);



    var bname = this.typeCache.addTypeDeclaration(name, declaration);
    logger.log("declared type! " + name + ": " + declaration);
  }


  private parseType(type: TypeScript.PullTypeSymbol, logger: ILogger): string {
    if (type === null) {
      return "Blame.Any";
    }

    var next: ILogger = logger.next();
    var kind: string = TypeScript.PullElementKind[type.kind];
    var generics: string[] = [];


    switch (type.kind) {
      case TypeScript.PullElementKind.Primitive:
        logger.log("primitive type: ");
        return this.parsePrimitiveType(type, next);

      case TypeScript.PullElementKind.FunctionType:
      case TypeScript.PullElementKind.ConstructorType:
      case TypeScript.PullElementKind.ObjectType:
      case TypeScript.PullElementKind.Class:
      case TypeScript.PullElementKind.Interface:
      case TypeScript.PullElementKind.Container:
        logger.log("type kind: " + kind);
        return this.parseSomeType(type, next);

        // Enums Are ignored
      case TypeScript.PullElementKind.Enum:
        logger.log("ignored type: " + kind);
        var ignored = logger.next(true);
        // Forcing the declaration mode, to prevent using the typeCache
        //this.parseObjectLikeType(type, ignored);
        return "Blame.Num";

      case TypeScript.PullElementKind.TypeParameter:
        logger.log("tyvar: " + type);
        return "Blame.tyvar('" + type + "')";

      default:
        throw Error("Panic, TypeSymbol: " + kind + " not supported!");
    }
  }


  private parsePrimitiveType(typeSymbol: TypeScript.PullTypeSymbol, logger: ILogger): string {
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

  private parseCallSignature(callSignature: TypeScript.PullSignatureSymbol, logger: ILogger, constr?: boolean): string {
    var next: ILogger = logger.next();
    logger.log("call singature");

    var generic = callSignature.isGeneric();
    var tyvars = [];

    if (generic) {
      tyvars = callSignature.getTypeParameters().map((type) => { return type.toString(); });
    }

    var requiredParameters: string[] = [];
    var optionalParameters: string[] = [];
    var restType: string = "null";
    var returnType: string = "null";

    var parameters: TypeScript.PullSymbol[] = callSignature.parameters;

    var parseParameterSymbol: (symbol: TypeScript.PullSymbol) => string = (symbol) => {
      next.log("parameter: " + symbol.getDisplayName());

      return this.parseType(symbol.type, next);
    };

    logger.log("required parameters: ");
    requiredParameters = parameters.filter(not(isRest)).filter(not(isOptional)).map(parseParameterSymbol);

    logger.log("optional parameters: ");
    optionalParameters = parameters.filter(not(isRest)).filter(isOptional).map(parseParameterSymbol);


    if (callSignature.hasVarArgs) {
      logger.log("rest parameter: ");
      var elementType: TypeScript.PullTypeSymbol = (parameters.filter(isRest)[0]).type;

      if (elementType) {
        restType = this.parseType(elementType.getElementType(), next);
      } else {
        // Parsing null will result in Blame.Any
        restType = this.parseType(elementType, next);
      }
    }

    if (callSignature.returnType) {
      logger.log("return type:");
      returnType = this.parseType(callSignature.returnType, next);
    }


    var output: string;

    if (!constr) {
      output = "Blame.fun([" + requiredParameters.join(", ") + "], " +
        "[" + optionalParameters.join(", ") + "], " +
        restType + ", " +
        returnType + ")";
    } else {
      output = "Blame.fun([" + requiredParameters.join(", ") + "], " +
        "[" + optionalParameters.join(", ") + "], " +
        restType + ", " +
        "Blame.Any, " +
        returnType + ")";
    }

    if (generic) {
      output = tyvars.reduce((output, tyvar) => {
        return "Blame.forall('" + tyvar + "', " + output + ")";
      }, output);
    }

    return output;
  }

  private parseFunctionLikeType(type: TypeScript.PullTypeSymbol, logger: ILogger): string {
    var callSignatures: TypeScript.PullSignatureSymbol[];
    var constrSignatures: TypeScript.PullSignatureSymbol[];
    var generic: boolean = type.getHasGenericSignature();

    constrSignatures = type.getConstructSignatures() || [];
    callSignatures = type.getCallSignatures() || [];

    logger.log("call signatures: ", callSignatures.length);
    var next: ILogger = logger.next();

    var signatures: string[] = constrSignatures.map((signature) => {
      return this.parseCallSignature(signature, next, true);
    });

    signatures = signatures.concat(callSignatures.map((signature) => {
      return this.parseCallSignature(signature, next);
    }));

    if (signatures.length === 0) {
      // No signatures
      logger.log("no call signatures, just a func");
      if (type.isFunction() || type.isConstructor()) {
        return "Blame.fun([], [], Blame.Any, Blame.Any)";
      }

      return "";
    }

    if (signatures.length === 1) {
      if (generic) {
        // Extract generics here
        //logger.log(type.getTypeArgumentsOrTypeParameters());
        // TODO: Write tyvar extraction manually
      }
      return signatures[0];
    }

    if (generic) {
      throw new Error("Panic, generics in unions are not supported");
    }

    return "Blame.union(" + signatures.join(", ") + ")";
  }

  private parseIndexSignature(indexSignature: TypeScript.PullSignatureSymbol, logger: ILogger): string {
    logger.log("index signature");
    var index: TypeScript.PullSymbol = indexSignature.parameters[0];
    if (index && index.type) {
      logger.log("index type: " + index.type.getDisplayName());
    }

    var retType: TypeScript.PullTypeSymbol = indexSignature.returnType;

    if (retType) {
      logger.log("return type: ");
      return this.parseType(retType, logger.next());
    }

    return "";
  }

  private parseSomeType(type: TypeScript.PullTypeSymbol, logger: ILogger, declaration?: boolean): string {
    var name: string = type.getTypeName();
    var typeName: string = type.getDisplayName();
    var next: ILogger = logger.next();

    var declarations: string[] = [];

    logger.log("some type: " + name);


    // It is an array type
    if (type.isArrayNamedTypeReference()) {
      return this.parseArrayType(type, logger.next());
    }

    // It is a named type
    if (type.isNamedTypeSymbol() && !declaration) {
      return this.parseNamedType(type, next);
    }

    // Is it an indexed type?
    if (type.hasOwnIndexSignatures()) {
      declarations = declarations.concat(this.parseIndexType(type, next));
    }

    // Is it an object type?
    if (type.isObject() || type.hasMembers()) {
      var objectDeclaration = this.parseObjectLikeType(type, next);
      if (objectDeclaration) {
        declarations.push(objectDeclaration);
      }
    }

    if (type.isFunction() || type.hasOwnCallSignatures() || type.hasOwnConstructSignatures()) {
      var funcDeclaration = this.parseFunctionLikeType(type, next);
      if (funcDeclaration) {
        declarations.push(funcDeclaration);
      }
    }

    if (declarations.length === 0) {
      return "";
    }

    if (declarations.length === 1) {
      return declarations[0];
    }

    return "Blame.hybrid(" + declarations.join(", ") + ")";
  }

  private parseArrayType(type: TypeScript.PullTypeSymbol, logger: ILogger): string {
    var next: ILogger = logger.next();
    logger.log("array type: ");
    return "Blame.arr(" + this.parseType(type.getElementType(), next) + ")";
  }

  private parseNamedType(type: TypeScript.PullTypeSymbol, logger: ILogger) {
    var name: string = type.getTypeName();
    var next: ILogger = logger.next();
    logger.log("named type: ");

    // Handling unknown type outside of declaration
    if (!this.typeCache.isTypeDeclared(name)) {
      var sourceDeclarations: TypeScript.PullDecl[] = type.getDeclarations();

      sourceDeclarations.forEach((decl) => {
        if (decl.fileName() !== this.filename) {
          logger.log("addition " + name + " from " + decl.fileName());
          this.parseDeclaration(decl, next);
        }
      });
    }

    // Handling an instantiated generic type
    if (type.isGeneric() && type.getTypeParameters().length) {

      // Rerun the declaration
      this.parseTypeDeclarationSymbol(type, next);
    }

    logger.log("load type: " + name);
    // Checking if the type was defined somewhere else
    return "T.get('" + name + "')";
  }


  private parseIndexType(type: TypeScript.PullTypeSymbol, logger: ILogger): string[] {
    var next: ILogger = logger.next();

    return type.getIndexSignatures().map((signature) => {
      logger.log("indexable type: ");

      var indexSignature: string = this.parseIndexSignature(signature, next);
      var idSignature: string = this.parseType(signature.parameters[0].type, next);

      switch (idSignature) {
        case "Blame.Num":
          return "Blame.arr(" + indexSignature + ")";

        case "Blame.Str":
          return "Blame.dict(" + indexSignature + ")";
      }
    });
  }

  private parseObjectLikeType(type: TypeScript.PullTypeSymbol, logger: ILogger): string {
    var name: string = type.getTypeName();
    var typeName: string = type.getDisplayName();
    var next: ILogger = logger.next();

    var declarations: string[] = [];

    logger.log("object type: " + name);

    var members: string = this.parseTypeMembers(type, next);

    // Add members
    if (members.length > 0) {
      return "Blame.obj({" + members + "})";
    }

    //// Compose the resulting type -- this is probably wrong
    //if (declarations.length === 0) {

    //  if (name.indexOf("\"") > -1 || name.indexOf("'") > -1) {
    //    // Module with an aliased export
    //    return this.parseAliasedModule(type, next);
    //  }

    //  return "Blame.obj({})";
    //}

    if (type.isContainer()) {
      logger.log("skipping empty container type");
      return "";
    }

    if (type.isObject() && !type.isFunction() && !type.hasOwnIndexSignatures()) {
      return "Blame.obj({})";
    }

    logger.log("not an object type");
    return "";
  }

  private parseAliasedModule(type: TypeScript.PullContainerSymbol, logger: ILogger) {
    var name = type.getDisplayName();
    logger.log("aliased module " + name);

    var next = logger.next();
    var parentDeclaration: TypeScript.ModuleDeclaration;

    if (type.hasExportAssignment()) {
      // Let's assume it only allows values:
      var value = type.getExportAssignedValueSymbol();
      var moduleType = this.parseType(value.type, logger.next());

      this.typeCache.addModuleDeclaration(name, moduleType);
    }
  }


  private parseTypeMembers(type: TypeScript.PullTypeSymbol, logger: ILogger): string {
    var members: TypeScript.PullSymbol[] = type.getAllMembers(TypeScript.PullElementKind.All, TypeScript.GetAllMembersVisiblity.all);

    logger.log("members:");
    var next: ILogger = logger.next();

    var parseSingleMember: (member: TypeScript.PullSymbol) => string = (member) => {
      return this.parseMember(member, next);
    };

    return members.map(parseSingleMember).filter(notBlank).sort().join(", ");
  }


  private parseMember(member: TypeScript.PullSymbol, logger: ILogger): string {
    var name: string = member.getDisplayName();
    logger.log("member: " + name);

    var type: string = this.parseType(member.type, logger.next());

    if (type) {
      if (member.isOptional) {
        logger.next().log("optional");
        type = "Blame.union(" + type + ", Blame.Null)";
      }
      return member.name + ": " + type;
    }

    logger.log("skipped member! " + name);
    return "";
  }
}



export function compile(filename: string, source: string, shouldLog?: boolean, node?: boolean): string {
  var logger: ILogger;
  if (shouldLog) {
    logger = new Logger();
  } else {
    logger = new NullLogger();
  }

  logger.log("parsing file: ", filename);

  var blameCompiler: BlameCompiler = new BlameCompiler(filename, node);

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
    blameCompiler.parseDeclaration(decl, nextLogger);
  }

  // TypeDeclarations
  decls.forEach(parseSingleDeclaration);

  // Clean up the compiler
  compiler.removeFile(filename);

  return blameCompiler.generateDeclarations();
}



export function compileFromString(source: string, shouldLog?: boolean) {
  return compile("generated.d.ts", source, !!shouldLog);
}



// vim: set ts=2 sw=2 sts=2 et :
