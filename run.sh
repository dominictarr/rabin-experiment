
run_no_compress () {
  node rabin.js --target $1 --no-compress
}

run_compress () {
  node rabin.js --target $1 --compress
}

run_catfile () {
  node rabin.js --target $1 --no-compress --source cat
}

run_catcompress () {
  node rabin.js --target $1 --compress --source cat
}

run_diff () {
  bash diff.sh $1
}

run_diff_compress () {
  COMPRESS=1 bash diff.sh $1
}

run () {

  run_$1 tape
  run_$1 yargs
  run_$1 minimist
  run_$1 traverse
  run_$1 wordwrap
  run_$1 scuttlebot

}

run diff_compress

