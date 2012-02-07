#!/bin/sh
git checkout master
showboat compile --force --copy_assets --out_path /tmp/showboat-example 
git checkout gh-pages
cp -r /tmp/showboat-example/* ./