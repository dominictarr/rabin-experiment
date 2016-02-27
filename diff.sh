# /usr/bin/env bash

compress () {
  if [ x$COMPRESS != x ]; then
    gzip
  else
    cat
  fi
}

function concat () {
  for V in versions/$1/*; do
    node ../catfile/index.js $V | compress
  done
}

function diff_all () {
  PREV=''
  for V in versions/$1/*; do
    if [ "x$PREV" = x ]
    then
      echo hi;
      node ../catfile/index.js "$V" | compress
    else
     diff <(node ../catfile/index.js $PREV) <(node ../catfile/index.js $V) -ed | compress
    fi

    PREV=$V
  done
}

size=$(diff_all $1 | wc -c)
total=$(concat $1 | wc -c)
echo $1, $size, $total, $(node -e "console.log(($size/$total) + ', ' + ($size < $total))")



