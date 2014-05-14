audio-analyser
==============

A Node audio analyser.

#Note

Currently not published on npm (everything about this is still in flux), I'll publish it after some further testing.

##Dependencies
- timed-buffer (https://github.com/DRuiter/timed-buffer)
- audio-buffer (https://github.com/DRuiter/audio-buffer)

###Note
audio-buffer isn't a full dependency as in it is required for instantiation, but audio-analyser
does require data supplied by the audio-buffer.

#Usage

##Instantiation

AudioAnalyser takes 1 parameter, the time in miliseconds for it's internal buffers.

##Methods

###analyse
Accepts an FFT Sample and will emit events based on it's internal checks.

###to be continued
This is currently too much in flux for proper documentation.
