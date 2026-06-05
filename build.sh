#!/bin/bash
echo "Building WebToEpub extension..."
rm -rf dist
mkdir -p dist
cp -r plugin/* dist/
echo "Minifying JavaScript files..."
find dist/js -name "*.js" -type f -exec npx --yes terser {} -o {} -c -m \;
echo "Build complete! Extension is ready in 'dist' folder."
