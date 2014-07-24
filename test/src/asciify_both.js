var asciify = require('asciify');

function empty() { return; }
asciify('Whoa', empty);
asciify('Whoa', empty);
asciify('Whoa', empty);

asciify.getFonts(function(err, fonts) { empty(err); fonts.slice(0); });
