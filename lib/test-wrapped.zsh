#!/usr/bin/env zsh
#

PASSFILE=$HOME/Developer/Blame/log/wrap-passed
FAILFILE=$HOME/Developer/Blame/log/wrap-failed
LOGDIR=$HOME/Developer/Blame/log

for package in `ls externals`;
do
    dir="externals/$package"

    echo "**** Testing wrapped package $package ****"
    ( cd $dir && ( npm test 1> $LOGDIR/wrap-${package}.out 2> $LOGDIR/wrap-${package}.err && echo "PASS $package" >> $PASSFILE || echo "FAIL $package" >> $FAILFILE ) )
done
