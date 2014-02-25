#!/bin/bash
set -e

#Move to the directory
cd $1

#Pull from Github
git pull origin master

#Do the fullbuild
rake fullbuild