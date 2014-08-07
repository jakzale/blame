#!/usr/bin/env zsh
#
#
# $1 should contain the files
string=`cat $1`

packages=("${(f)string}")

for package in $packages; do
    #Try to get the following informations
    TEST=`npm view $package scripts.test 2>/dev/null`
    REPO=`npm view $package repository.url 2>/dev/null`
    [[ -n $TEST && -n $REPO ]] && echo "$package\t$TEST\t$REPO" >> passes-tests.txt
    echo "$package\t$TEST\t$REPO"
done
