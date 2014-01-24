#!/bin/bash
set -e

cd $2
sudo rake $1
sudo rake fullbuild