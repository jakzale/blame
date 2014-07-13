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

class Diagnostic {
    public line_index: number;
    public char_index: number;

    constructor(public type: string, public path: string, public text: string, public message: string) {
        this.line_index = 0;
        this.char_index = 0;
    }

    public computeLineInfo(content: string, start: number): void {
        for(var i = 0; i < start; i++) {
            var ch=content[i];

            if(ch == '\r\n') {
                this.line_index += 1;
                this.char_index = 0;

                i += 1;
            }


            if(ch == '\n') {
                this.line_index += 1;
                this.char_index = 0;
            }

            this.char_index += 1;
        }
    }

    public toString(): string {
        return this.path + " [" + (this.line_index+1).toString() + ":" +
            (this.char_index + 1).toString() + "] " + this.message;
    }

    public clone(): Diagnostic {

        var clone = new Diagnostic(this.type.toString(),
                this.path.toString(),
                this.text.toString(),
                this.message.toString());

        clone.char_index=this.char_index;
        clone.line_index=this.line_index;

        return clone;
    }
}

// Shim for holding units
class Unit {
    public path: string;
    public content: string;
    public diagnostics: Diagnostic[];

    constructor(path: string, content: string, diagnostics: Diagnostic[]) {
        this.path = path;
        this.content = content;
        this.diagnostics = diagnostics;
    }

    public hasError(): boolean {
        if (this.diagnostics) {
            return this.diagnostics.length > 0;
        }
        return false;
    }
}

class SourceUnit extends Unit {
    public remote: boolean;
    public state: string;

    constructor(path: string, content: string, diagnostics: Diagnostic[], remote: boolean) {
        if (!content) content = '';
        this.state = 'default';
        this.remote = remote;

        super(path, content, diagnostics);
    }

    // For now references return empty array
    public references(): string[] {
        return [];
    }

    public clone(): SourceUnit {
        var diagnostics;

        for (var i = 0; i < this.diagnostics.length; i++) {
            diagnostics.push(this.diagnostics[i].clone());
        }

        var clone = new SourceUnit(this.path.toString(), this.content.toString(), diagnostics, this.remote);

        clone.state = this.state.toString();

        return clone;
    }
}

function parsePullDeclaration(decl: TypeScript.PullDecl) {
    switch (decl.kind) {
        case TypeScript.PullElementKind.Variable :
            console.log('variable: ', decl.getDisplayName());

            var symbol = decl.getSymbol();

            console.log(symbol.getNameAndTypeName());
            break;
    }

    var decls: TypeScript.PullDecl[] = decl.getChildDecls();
    for (var i = 0, n = decls.length; i < n; i++) {
        parsePullDeclaration(decls[i]);
    }
}

function get_diagnostic_message(diagnostics: TypeScript.Diagnostic[]) {
    if (diagnostics.length) {

        for (var i = 0, n = diagnostics.length; i < n; i++) {
            messages.push(diagnostics[i].diagnosticKey());
        }
        return(messages.join('\n'));
    }

    return "";
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
    var sourceUnit = new SourceUnit('generated.d.ts', source, false);
    var snapshot = TypeScript.ScriptSnapshot.fromString(sourceUnit.content);

    compiler.addFile(sourceUnit.path, snapshot, TypeScript.ByteOrderMark.Utf8, 0, false);

    // Getting diagnostics, throw an error on diagnostic
    var diagnostics:TypeScript.Diagnostic[] = compiler.getSyntacticDiagnostics('generated.d.ts');
    var message = get_diagnostic_message(diagnostics);
    if (message) {
        throw new Error(message);
    }

    // I am not sure if throwing semantic errors is possible in declarations
    //diagnostics:TypeScript.Diagnostic[] = compiler.getSemanticDiagnostics('generated.d.ts');
    //message = get_diagnostic_message(diagnostics);
    //if (message) {
        //throw new Error(message);
    //}

    //compiler.getSemanticDiagnostics('generated.d.ts');
    var decl:TypeScript.PullDecl = compiler.topLevelDecl('generated.d.ts');

    parsePullDeclaration(decl);
    // Creating a source unit
    return "done!";
}

