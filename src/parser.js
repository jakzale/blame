// New version of the parser, actually just a custom Emitter
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// TypeScriptCompiler
///<reference path='./typescript.d.ts' />
(function (Blame) {
    var BlameEmitter = (function (_super) {
        __extends(BlameEmitter, _super);
        function BlameEmitter() {
            _super.apply(this, arguments);
        }
        return BlameEmitter;
    })(TypeScript.Emitter);
    Blame.BlameEmitter = BlameEmitter;

    var BlameCompiler = (function (_super) {
        __extends(BlameCompiler, _super);
        function BlameCompiler() {
            _super.apply(this, arguments);
        }
        return BlameCompiler;
    })(TypeScript.TypeScriptCompiler);
    Blame.BlameCompiler = BlameCompiler;

    function version() {
        return "0.0.1";
    }
    Blame.version = version;
})(exports.Blame || (exports.Blame = {}));
var Blame = exports.Blame;
