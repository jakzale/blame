// Some experiments with JavaScript and proxies
// Made for node
var t = {};
var handler = {
    get: function (receiver, name) {
        console.log('p', name);
        return t[name];
    }
};

global.a = Proxy.create(handler, t);
