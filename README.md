# rabin-experiment

experiment to evaluate the practicality of rabin finger prints as a strategy for efficient file replication,
particularily in the usecase of a package manager or version control system.

## motivation

software changes. when software changes, those changes need to be distributed
to both developers and users. there are several designs currently in use.
npm uses a naive implementation, whereby each new version of a package is
bundled (via tar) and then compressed (via gzip). git has a much more sophisticated design.
snapshots of files and directories are stored in a content addressable store,
and then when those objects are requested the are sent in a packfile. this is a complicated structure that contains many objects that are represented as diffs in terms of each other and then compressed.
however, git achives very good compression this way.

A new approach, which has is being developed in dat and ipfs is to use rabin
fingerprints to deterministically break files into chunks. These rabin chunks
are "insert resistent" which means that most of the break positions are likely
to be the same, even after an insertion.

But how well does this compare to the approaches of npm or git in practice?

## NOTE

I recently realized the default settings of `rabin` don't produce very
good reductions, but if you adjust them you find many more matching blocks.
(however I need to rewrite the following experiments to present that better)

## experiment 1 - rabin vs npm

Take multiple versions of some npm package, and split it up with
rabin fingerprints, then sum the size of the unique pieces.
(in a real protocol, we'd need to have some extra metadata about what pieces are used,
so this model only gives a lower bound of how much data a rabin split version history would take.

Compare this with the npm model: compress each package version, but do not
attempt anything with diffs.

To make the test realistic, I just tested with the data I already had in my npm cache.
It's not equally likely that a user has any particular version of an npm module.
some versions are more stable, and so remain the latest version later,
and some versions are used by other stable, popular modules, so you are more likely to install those versions.

npm represents packages as gzipped tape archives, but i soon found
that if I didn't ungzip before applying rabin, then I would not see any shared
chunks, so rabin wouldn't make any improvement at all. So the first experiment
applies to modules that have been uncompressed, but are still in the tar format.

I used a script to list all the modules in my cache that had more than one
version, and then ran the experiment on some packages that had more than one version.

### results

```
name, versions, unique size, total size, ratio, rabin is smaller
tape, 11, 1024954, 1306112, 0.7847366841434732, true
yargs, 4, 427390, 508416, 0.8406305073011078, true
minimist, 6, 183970, 232448, 0.7914458287444934, true
traverse, 3, 194048, 205312, 0.9451371571072319, true
wordwrap, 3, 80666, 141312, 0.5708361639492754, true
scuttlebot, 8, 5052008, 17029120, 0.29666876503307277, true
```

some models get quite a bit smaller. scuttlebot gets especially small,
but it contains a compiled file that is all the dependencies linked into
one javascript file (for fast loading)

This does show that rabin does have an effect, but is not realistic
because we are not taking into account compression. compression can
usually reduce natural langage (or source code) to about 30% (70% saving), so these ratios
are not particularily good compared to the expectation for text.
for all but 2 packages, the saving is less than 1/4.

## experiment 2, compare with compression after split.

compression makes the problem more difficult, because that interacts
with rabin fingerprints. to share a chunk we'd have to access it directly,
so it would need to be either stored plain, or compressed after it is split.


### results

```
name, versions, unique size, total size, ratio, rabin is smaller
tape, 11, 270865, 170186, 1.5915821512932908, false
yargs, 4, 144993, 140236, 1.0339213896574346, false
minimist, 6, 47154, 40170, 1.1738610903659448, false
traverse, 3, 49663, 31095, 1.5971378035053867, false
wordwrap, 3, 29538, 42964, 0.6875058188250629, true
scuttlebot, 8, 1653999, 4299643, 0.38468286785670347, true
```

the packages that only got slightly smaller before are now larger.
for these modules, it is more efficient to just send a compressed snapshot
of the whole package. npm wins!

possibly something is confusing the chunking? these are just tarfiles,
and tarfiles have quite complicated headers. prehaps a simpler format
would be more likely to produce an identical block?

## experiment 3, simpler format.

My self and the dat team had already begun to think about a simpler alternative to tar,
so i whipped up a prototype implementation to test in place of tar.
We had been calling the format catfiles. ostensibly it stands for
Consistent Archive Tree, but really, max ogden suggested it because he likes
cats. This format eliminates all framing except for a length,
and writes out some metadata about directories as json.

## results

```
name, versions, unique size, total size, ratio, rabin is smaller
tape, 11, 715354, 851136, 0.840469678171291, true
yargs, 4, 384458, 461770, 0.8325746583797129, true
minimist, 6, 153766, 161173, 0.9540431710025873, true
traverse, 3, 138341, 140325, 0.9858613931943702, true
wordwrap, 3, 75674, 113630, 0.6659684942356772, true
scuttlebot, 8, 4979721, 16740278, 0.29746943270595627, true
```

this new format reduced the overhead of tar somewhat,
11 versions of tape took only 851k, instead of 1.3 mb,
that is about 35% less. minimist is reduced down to 161k instead of 232k.
also a ~30% saving! so we made a more efficient archiving protocol,
but the ratio of savings via rabin chunks have not improved. In fact,
apart from yargs, the ratio of size has gotten slightly narrower!

So it looks like there is more to gain from a better framing format
than from rabin fingerprinting.

## experiment 4, simpler format, with compression

as experiment 2, except with gzip compression on top of catfiles.

```
tape, 11, 181961, 158633, 1.1470564132305383, false
yargs, 4, 134500, 136614, 0.9845257440672259, true
minimist, 6, 43064, 38671, 1.1135993380052236, false
traverse, 3, 38121, 29910, 1.2745235707121365, false
wordwrap, 3, 30860, 42696, 0.7227843357691587, true
scuttlebot, 8, 1650381, 4288783, 0.3848133608065505, true
```

again, apart from wordwrap and scuttlebot, the size used
actually increases if you split files into rabin chunks before compressing.

although, note that the compressed catfile is still 30% smaller than the compressed tarfile.

## experiment 5, represent package versions as initial + patches

take a git like approach, although, for simplicity,
I decided to simulate git. just iterate over all the versions of a module,
and generate a diff between each two successsive pairs. catfiles are a text
format, so it's easy to generate line based diffs. all the javascript
diff implementations where very slow, so I wrote a bash script and used
the diff command.

```
tape, 146712, 851136, 0.1723719828558538, true
yargs, 242250, 464334, 0.5217149724121, true
minimist, 48217, 161173, 0.2991630111743282, true
traverse, 80205, 140325, 0.5715660074826296, true
wordwrap, 40341, 113630, 0.35502068115814484, true
scuttlebot, 3432303, 16745210, 0.2049722278788979, true
```
initial + diff is achiving significant reductions. even tape,
which didn't reduce very well with rabin. can now be represented
in less than 20% of the space of storing every version.

## experiment 6, diffs + compression

Because we must be able to randomly access the diffs,
so as to reconstruct a particular package version.
That means we must compress each diff independently.

### results

```
package, size, total (compressed), ratio, is compressed diffs smaller
tape, 37013, 158372, 0.23370924153259415, true
yargs, 72994, 135458, 0.5388681362488742, true
minimist, 12675, 38697, 0.32754477091247386, true
traverse, 19152, 29796, 0.6427708417237213, true
wordwrap, 15244, 42268, 0.36065108356203274, true
scuttlebot, 869787, 4300943, 0.20223169663025062, true
```

the reduction in size via patching is less strong if the snapshots
are compressed, but still achives a significant improvement.

comparing the diffed, compressed versions, against the uncompressed snapshots,
there the reduction is impressive.

```
package, size, total (uncompressed), ratio, is compressed diffs smaller.
tape, 37013, 851136, 0.04348658733739379, true
yargs, 72994, 464334, 0.15720149719813756, true
minimist, 12675, 161173, 0.0786422043394365, true
traverse, 19152, 140325, 0.13648316408337788, true
wordwrap, 15244, 113630, 0.1341547126639092, true
scuttlebot, 869787, 16745210, 0.05194243607574942, true
```

tape and scuttlebot are only 5% the full size when represented as compressed
diffs.

## TODO

* currently tables have been generated by editing run.sh and rerunning.
  rewrite so it's possbile to rerun every experiment.
* I more recently realized more matching blocks where found if the size is smaller.
  do an experiment where the block size is varied, and measure performance.
* to replicate the chunks we need either a hashlist or a merkle tree. take this into account when comparing reduction strategies.
* replace the tables with graphs
* the packages in my cache are not all the versions of that package.
  in the case of initial+patch based repos, I need to have all the patches
  to get up to a snapshot. compare this with just having sporadic snapshots.

## License

MIT


