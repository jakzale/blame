#!/usr/bin/env zsh
#

string=`cat log/passed`

PACKAGES=("${(f)string}")

for entry in $PACKAGES;
do
    keys=("${(s/ /)entry}")
    package=$keys[2]
    dir="externals/$package"

    echo "**** Check main and reset file in $dir ****"
    #(cd $dir && MAIN=`cat package.json | grep \"main\" | sed 's/.*"main"\ *:\ *"\([^"]*\)".*/\1/'` && [[ -n $MAIN ]] || MAIN="index.js" && FILENAME=`ls ${MAIN%}(.js|js|)*(.)` && git checkout -- $FILENAME)
    (cd $dir && git checkout . )
done
