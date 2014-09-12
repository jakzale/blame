#!/usr/bin/env zsh
#

for package in `ls externals`;
do
    dir="externals/$package"

    echo "**** Installing in $dir ****"
    ( cd $dir && npm install )
done
