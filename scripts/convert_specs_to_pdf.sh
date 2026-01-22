#!/bin/bash
# brew install pandoc tectonic
pandoc specs/*.md -o specs/specifications.pdf --pdf-engine=tectonic --toc --metadata title="Project Specifications"
