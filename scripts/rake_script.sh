#!/bin/bash
set -e

cd $1
rake $2
rake fullbuild