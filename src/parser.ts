// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

// Asume there is no need of a resolver at the moment


export class BlameEmitter extends TypeScript.Emitter {
}

export class BlameCompiler extends TypeScript.TypeScriptCompiler {
}

// This to ensure that the Parer Module is properly exported
export function version() {
    return "0.0.1";
}

function get_diagnostic_message(diagnostics: TypeScript.Diagnostic[]) {
    var messages:string[] = [];

    if (diagnostics.length) {

        for (var i = 0, n = diagnostics.length; i < n; i++) {
            messages.push(diagnostics[i].diagnosticKey());
        }
        return(messages.join('\n'));
    }

    return "";
}

export function getName(ast: TypeScript.AST) {
    var k = ast.kind();
    switch (k) {
        case TypeScript.SyntaxKind.IdentifierName:
            return (<TypeScript.Identifier>ast).text();
        case TypeScript.SyntaxKind.QualifiedName:
            var qn = <TypeScript.QualifiedName>ast;
            return getName(qn.left) + '.' + getName(qn.right);
        default:
            return TypeScript.SyntaxKind[k];
    }
}

function parse(ast: TypeScript.AST): string {
    switch (ast.kind()) {
        case TypeScript.SyntaxKind.SourceUnit:
            return parseSourceUnit(<TypeScript.SourceUnit> ast);
        case TypeScript.SyntaxKind.VariableStatement:
            return parseVariableStatement(<TypeScript.VariableStatement> ast);
        case TypeScript.SyntaxKind.VariableDeclaration:
            return parseVariableDeclaration(<TypeScript.VariableDeclaration> ast);
        case TypeScript.SyntaxKind.VariableDeclarator:
            return parseVariableDeclarator(<TypeScript.VariableDeclarator> ast);
        case TypeScript.SyntaxKind.ArrayType:
            return parseArrayType(<TypeScript.ArrayType> ast);
        case TypeScript.SyntaxKind.GenericType:
            return parseGenericType(<TypeScript.GenericType> ast);
        case TypeScript.SyntaxKind.TypeArgumentList:
            return parseTypeArgumentList(<TypeScript.TypeArgumentList> ast);
        case TypeScript.SyntaxKind.FunctionDeclaration:
            return parseFunctionDeclaration(<TypeScript.FunctionDeclaration> ast);
        case TypeScript.SyntaxKind.CallSignature:
            return parseCallSignature(<TypeScript.CallSignature> ast);

        /* Keywords */
        case TypeScript.SyntaxKind.NumberKeyword:
            return 'Blame.Num';
        case TypeScript.SyntaxKind.BooleanKeyword:
            return 'Blame.Bool';
        case TypeScript.SyntaxKind.StringKeyword:
            return 'Blame.Str';

        /* Identifier */
        case TypeScript.SyntaxKind.IdentifierName:
            return parseIdentifier(<TypeScript.Identifier> ast);

        /* TypeAnnotation */
        case TypeScript.SyntaxKind.TypeAnnotation:
            return parseTypeAnnotation(<TypeScript.TypeAnnotation> ast);

        default:
            throw Error('Panic: ' + TypeScript.SyntaxKind[ast.kind()] + ' not supported');
    }
    return '';
}

function parseSourceUnit(sourceUnit: TypeScript.SourceUnit): string {
    var output : string[] = [];

    for (var i = 0, n = sourceUnit.moduleElements.childCount(); i < n; i++) {
        output.push(parse(sourceUnit.moduleElements.childAt(i)));
    }

    return output.join('\n');
}

function parseVariableStatement(variableStatement: TypeScript.VariableStatement): string {
    return parse(variableStatement.declaration);
}

function parseVariableDeclaration(variableDeclaration: TypeScript.VariableDeclaration): string {
    var declarators: TypeScript.ISeparatedSyntaxList2 = variableDeclaration.declarators;
    var output: string[] = [];

    for (var i = 0, n = declarators.nonSeparatorCount(); i < n; i++) {
        output.push(parse(declarators.nonSeparatorAt(i)));
    }

    return output.join('\n');
}

function parseVariableDeclarator(variableDeclarator: TypeScript.VariableDeclarator): string {
    var name: string = parsePropertyName(variableDeclarator.propertyName);

    var type: string = parse(variableDeclarator.typeAnnotation);

    return name + ' = ' + 'Blame.simple_wrap(' + name + ', ' + type + ');';
}

function parsePropertyName(name: TypeScript.IASTToken):string {
    return name.text();
}

function parseTypeAnnotation(type: TypeScript.TypeAnnotation):string {
    return parse(type.type);
}

function parseArrayType(type: TypeScript.ArrayType):string {
    var type: string = parse(type.type);

    return 'Blame.arr(' + type + ')';
}

function parseGenericType(type: TypeScript.GenericType):string {
    var name:string = parseIdentifier(type.name);
    switch (name) {
        case 'Array':
            return 'Blame.arr(' + parse(type.typeArgumentList) +')';
        default:
            throw Error('Panic: Generic ' + name +' not supported');
    }
}

function parseTypeArgumentList(list: TypeScript.TypeArgumentList):string {
    var types : string[] = [];
    var typeArguments:TypeScript.ISeparatedSyntaxList2 = list.typeArguments;

    for (var i = 0, n = typeArguments.nonSeparatorCount(); i < n; i++) {
        types.push(parse(typeArguments.nonSeparatorAt(i)));
    }

    return types.join(', ');
}

function parseIdentifier(type: TypeScript.Identifier) {
    return type.text();
}

function parseFunctionDeclaration(declaration: TypeScript.FunctionDeclaration):string {
    var name = parse(declaration.identifier);
    var type = parse(declaration.callSignature);

    if (type) {
        return name + ' = Blame.simple_wrap(' + name + ', ' + type + ');';
    }

    return '';
}

function parseCallSignature(signature: TypeScript.CallSignature):string {
    var typeParameterList: TypeScript.TypeParameterList = signature.typeParameterList;
    var parameterList: TypeScript.ParameterList = signature.parameterList;
    var requiredParameters: string[] = [];
    var optionalParameters: string[] = [];
    var repeatType: string = 'null';
    var returnType: string = 'null';

    if (signature.typeAnnotation) {
        returnType = parse(signature.typeAnnotation);
    }

    var output: string = 'Blame.func([' + requiredParameters.join(', ') +'], ' +
                                    '[' + optionalParameters.join(', ') + '], ' +
                                     repeatType + ', ' +
                                     returnType + ')';

    return output;
}

export function compileFromString(source: string) {
    var compiler:TypeScript.TypeScriptCompiler;
    var logger:TypeScript.ILogger = new TypeScript.NullLogger();
    var settings:TypeScript.CompilationSettings = new TypeScript.CompilationSettings();

    // hardcoding this for now;
    settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
    settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;

    compiler = new TypeScript.TypeScriptCompiler(logger,
            TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

    // Create a simple source unit
    var snapshot = TypeScript.ScriptSnapshot.fromString(source);

    compiler.addFile('generated.d.ts', snapshot, TypeScript.ByteOrderMark.Utf8, 0, false);

    // Getting diagnostics, throw an error on diagnostic
    var diagnostics:TypeScript.Diagnostic[] = compiler.getSyntacticDiagnostics('generated.d.ts');
    var message = get_diagnostic_message(diagnostics);
    if (message) {
        throw new Error(message);
    }

    var decl:TypeScript.PullDecl = compiler.topLevelDecl('generated.d.ts');

    var ast:TypeScript.AST = decl.ast();

    return parse(ast);
}


