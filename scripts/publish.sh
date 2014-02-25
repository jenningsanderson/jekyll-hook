#!/bin/bash
set -e

#Move to the directory
cd $1

#Pull from Github ( With Force! )
git fetch --all
git reset --hard origin/master

#Do the fullbuild
rake fullbuild