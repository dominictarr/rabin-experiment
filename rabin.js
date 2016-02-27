var Stats = require('statistics')
var opts = require('minimist')(process.argv.slice(2))
var pull = require('pull-stream')
var paramap = require('pull-paramap')
var glob = require('pull-glob')
var toPull = require('stream-to-pull-stream')
var crypto = require('crypto')
var rabin = require('rabin')
var zlib = require('zlib')
var File = require('pull-file')
var Catfile = require('catfile')

var sizes = Stats()

function hash(data) {
  return crypto.createHash('sha256').update(data).digest('base64')
}

var results = {}
var size = 0, total = 0
var bits = opts.bits, min = 1 << (bits-4), max = 1 << (bits+4)
console.log(min, max, bits)
var source = opts.source || 'cache'
var target = opts.target
var compress = opts.compress !== false

function gzip () {
  return toPull.duplex(zlib.Gzip())
}

function gunzip () {
  return toPull.duplex(zlib.Gunzip())
}

var versions = 0

pull(
  glob(
    source === 'cache'
    ? process.env.HOME + '/.npm/' + target + '/*/package.tgz'
    : './versions/'+target + '/*'
  ),
  pull.through(console.error),
  paramap(function (file, cb) {
    versions ++
    pull(
      //Catfile(file),
      source === 'cache'
      ? pull(File(file), gunzip())
      : Catfile(file),
      compress ? gzip() : pull.through(),
      pull.through(function (d) {
        total += d.length
      }),
      compress ? gunzip() : pull.through(),
      toPull.duplex(rabin({min: min, max: max, bits: bits})),
      pull.drain(function (data) {
        var h = hash(data)
        if(!results[h]) {
          var length = compress ? zlib.gzipSync(data).length : data.length
          sizes.value(data.length)
          results[h] = {size: length, count: 0}
          size += length
        }
        results[h].count ++
      }, function (err) {
        console.error('processed:', file)
        cb(err)
      })
    )
  }),
  pull.drain(null, function (err) {
    console.error(results)
    console.log([target, versions, size, total, size/total, size < total, sizes.count, sizes.mean].join(', '))
  })
)







