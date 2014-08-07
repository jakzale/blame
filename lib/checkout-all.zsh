#!/usr/bin/env zsh
#
#
# $1 should contain the files
string=`cat passes-tests.txt`

entries=("${(f)string}")

for entry in $entries; do
    #Try to get the following informations
    keys=("${(s/	/)entry}")
    REPO=${keys[3]}
    DIR="externals/${keys[1]}"
    #[[!(-d "${DIR}")]] && echo "git submodule add $REPO $DIR"
    git submodule add $REPO $DIR
done
