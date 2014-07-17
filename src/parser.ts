// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

// Asume there is no need of a resolver at the moment


// This to ensure that the Parer Module is properly exported
export function version() {
    return "0.0.1";
}

function get_diagnostic_message(diagnostics: TypeScript.Diagnostic[]) {
    var messages:string[] = [];

    if (diagnostics.length) {

        for (var i = 0, n = diagnostics.length; i < n; i++) {
            messages.push(diagnostics[i].message());
        }
        return(messages.join('\n'));
    }

    return "";
}

// Declaring the compiler as static
declare var LibD: string;

var compiler:TypeScript.TypeScriptCompiler = null;
var logger:TypeScript.ILogger = new TypeScript.NullLogger();
var settings:TypeScript.CompilationSettings = new TypeScript.CompilationSettings();

// hardcoding this for now;
settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;

compiler = new TypeScript.TypeScriptCompiler(logger,
        TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

var libdSnapsthot = TypeScript.ScriptSnapshot.fromString(LibD);
compiler.addFile('lib.d.ts', libdSnapsthot, TypeScript.ByteOrderMark.Utf8, 0, false);

var call: number = 0;
export function compileFromString(source: string, shouldLog?: boolean) {
    call += 1;

    function log(...rest: any[]) {
        if (shouldLog) {
            console.log.apply(undefined, [call + ' '].concat(rest));
        }
    }
    var filename: string = 'generated.d.ts';
    // Create a simple source unit
    var snapshot = TypeScript.ScriptSnapshot.fromString(source);

    // Adding the lib.d file

    compiler.addFile('generated.d.ts', snapshot, TypeScript.ByteOrderMark.Utf8, 0, false);

    // Getting diagnostics, throw an error on diagnostic
    var diagnostics:TypeScript.Diagnostic[] = compiler.getSyntacticDiagnostics(filename);
    var message = get_diagnostic_message(diagnostics);
    if (message) {
        compiler.removeFile(filename);
        throw new Error(message);
    }

    // I am unsure if declaration file can cause semantic diagnostic
    // This will trigger the type resolver

    diagnostics = compiler.getSemanticDiagnostics(filename);
    var message = get_diagnostic_message(diagnostics);
    if (message) {
        throw new Error(message);
    }

    var decl:TypeScript.PullDecl = compiler.topLevelDecl(filename);

    function parsePullDecl(declaration: TypeScript.PullDecl):string {
        switch (declaration.kind) {
            case TypeScript.PullElementKind.Variable:
                log('got variable');
                return parsePullSymbol(declaration.getSymbol());
            case TypeScript.PullElementKind.FunctionType:
                log('got function type');
                return '';
            case TypeScript.PullElementKind.Function:
                log('got function');
                return parsePullSymbol(declaration.getSymbol());
            case TypeScript.PullElementKind.ObjectType:
                return '';
            default:
                throw new Error('Panic, Declaration: ' + TypeScript.PullElementKind[declaration.kind] + ' not supported');
        }
    }

    function parsePullSymbol(pullSymbol: TypeScript.PullSymbol): string {
        var name: string = pullSymbol.name;
        var type: string = parsePullTypeSymbol(pullSymbol.type);

        log(name, type);

        return name + ' = Blame.simple_wrap(' + name + ', ' + type + ');';
    }

    function parsePullTypeSymbol(typeSymbol: TypeScript.PullTypeSymbol): string {
        switch (typeSymbol.kind) {
            case TypeScript.PullElementKind.Primitive:
                log('parsing primitive type');
                return parsePrimitiveType(typeSymbol);
            case TypeScript.PullElementKind.Interface:
                log('parsing interface');
                return parseInterface(typeSymbol);
            case TypeScript.PullElementKind.FunctionType:
                log('parsing function type');
                return parseFunctionType(typeSymbol);
            case TypeScript.PullElementKind.ObjectType:
                log('parsing object type');
                return parseObjectType(typeSymbol);

            default:
                throw Error('Panic, TypeSymbol: ' + TypeScript.PullElementKind[typeSymbol.kind] + ' not supported!');
        }
    }

    function parsePrimitiveType(typeSymbol: TypeScript.PullTypeSymbol): string {
        var type: string = typeSymbol.getDisplayName();

        switch (type) {
            case 'number':
                return 'Blame.Num';
            case 'boolean':
                return 'Blame.Bool';
            case 'string':
                return 'Blame.Str';
            case 'any':
                return 'null';

            default:
                throw Error('Panic, PrimitiveType: ' + type + ' not supported!');
        }
    }

    function parseInterface(typeSymbol: TypeScript.PullTypeSymbol): string {
        var type: string = typeSymbol.getDisplayName();

        switch (type) {
            case 'Array':
                return 'Blame.arr(' + parsePullTypeSymbol(typeSymbol.getElementType()) + ')';

            default:
                throw Error('Panic, Interface: ' + type + ' not supported!');
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
        }
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
            throw new Error('Panic, Functions with more than one call singature not supported: ' + typeSymbol.getFunctionSymbol().name);
        }

        var requiredParameters: string[] = [];
        var optionalParameters: string[] = [];
        var repeatType = 'null';
        var returnType = 'null';


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

        var output: string = 'Blame.func([' + requiredParameters.join(', ') +'], ' +
                '[' + optionalParameters.join(', ') + '], ' +
                repeatType + ', ' +
                returnType + ')';

        return output;
    }

    function parseMember(member: TypeScript.PullSymbol) {
        return member.name + ': ' + parsePullTypeSymbol(extractType(member));
    }

    function parseObjectType(typeSymbol: TypeScript.PullTypeSymbol): string {
        var members: TypeScript.PullSymbol[] = typeSymbol.getMembers();
        var outMembers: string[] = members.map(parseMember);

        return 'Blame.obj({' + outMembers.join(', ')  + '})';
    }

    var decls = decl.getChildDecls();
    var intermediate: string[] = decls.map(parsePullDecl);
    //console.log(intermediate);
    var result = intermediate.filter(function (e) {return e.length > 0}).join('\n');
    compiler.removeFile(filename);

    return result;
}


