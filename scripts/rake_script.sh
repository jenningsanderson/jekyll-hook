#!/bin/bash
set -e

cd $2
rake $1
rake fullbuild