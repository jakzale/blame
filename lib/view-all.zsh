#!/usr/bin/env zsh
#
#
# $1 should contain the files
string=`cat $1`

packages=("${(f)string}")

for package in $packages; do
    #Try to get the following informations
    TEST=`npm view $package scripts.test 2>/dev/null`
    [[ -n $TEST ]] && echo "$package\t$TEST" >> passes-tests.txt
    echo $package
done
