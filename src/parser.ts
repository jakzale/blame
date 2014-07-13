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


export function compileFromString(source: string) {
    var compiler:TypeScript.TypeScriptCompiler;
    var logger:TypeScript.ILogger = new TypeScript.NullLogger();
    var settings:TypeScript.CompilationSettings = new TypeScript.CompilationSettings();

    // hardcoding this for now;
    settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
    settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;

    compiler = new TypeScript.TypeScriptCompiler(logger,
            TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings));

    return "done!";
}

