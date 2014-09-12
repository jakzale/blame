#!/usr/bin/env zsh
#

for package in `ls externals`;
do
    dir="externals/$package"

    echo "**** Initializing submodules in $dir ****"
    ( cd $dir && [[ -f .gitmodules ]] && echo "Initializng submodules in $package" && git submodule init && git submodule update )
done
