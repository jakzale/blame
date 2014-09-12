#!/usr/bin/env zsh
#

PASSFILE=$HOME/Developer/Blame/log/passed
FAILFILE=$HOME/Developer/Blame/log/failed
LOGDIR=$HOME/Developer/Blame/log
for package in `ls externals`;
do
    dir="externals/$package"

    echo "**** Testing package $package ****"
    ( cd $dir && ( npm test 1> $LOGDIR/${package}.out 2> $LOGDIR/${package}.err && echo "PASS $package" >> $PASSFILE || echo "FAIL $package" >> $FAILFILE ) )
done
