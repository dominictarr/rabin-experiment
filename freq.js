var pull = require('pull-stream')
var toPull = require('stream-to-pull-stream')
var f = {}
pull(
  toPull.source(process.stdin),
  pull.drain(function (data) {
    var s = data.toString()
    for(var i = 0; i < s.length; i++)
      f[s[i]] = (f[s[i]]||0) + 1
  }, function (err) {
    if(err) throw err
    var o =
    Object.keys(f).sort(function (a, b) {
      return f[b] - f[a]
    }).slice(0, 50).map(function (k) {
      return [k, f[k]]
    })
    console.log(JSON.stringify(o))
  })
)
