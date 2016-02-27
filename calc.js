var lines = [
['tape', 37013, 851136],
['yargs', 72994, 464334],
['minimist', 12675, 161173],
['traverse', 19152, 140325],
['wordwrap', 15244, 113630],
['scuttlebot', 869787, 16745210]
]

lines.forEach(function (l) {
  console.log([l[0], l[1], l[2], l[1]/l[2], l[1] < l[2]].join(', '))
})

