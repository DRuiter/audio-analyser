var EventEmitter 	= require("events").EventEmitter,
		TimedBuffer		= require("./timed-buffer");

function AudioAnalyser (timeMS){
	var self = this;

	EventEmitter.call(this);

	if(!timeMS) timeMS = 500;

	this.loudnessBuffer = new TimedBuffer(timeMS);
	this.bandBuffer			= new TimedBuffer(timeMS);
	this.bandBeats			= [];
	this.lastSpike			= new Date().getTime();

	this.analyse = function ( FFTSample ){
		//Analysis
		var loudness = this.getLoudness(FFTSample);

		//Buffering
		this.loudnessBuffer.push(loudness);

		if(loudness > 50){
			//Frequency Ranges
			var beats = {
				subBass		: this.weightCheck(this.getFrequencyRange(FFTSample, 0, 62)),
				midBass		: this.weightCheck(this.getFrequencyRange(FFTSample, 62, 125)),
				upperBass	: this.weightCheck(this.getFrequencyRange(FFTSample, 125, 250)),
				lowerMid	: this.weightCheck(this.getFrequencyRange(FFTSample, 250, 500)),
				midMid		: this.weightCheck(this.getFrequencyRange(FFTSample, 500, 1000)),
				upperMid	: this.weightCheck(this.getFrequencyRange(FFTSample, 1000, 2000)),
				lowerTreble	: this.weightCheck(this.getFrequencyRange(FFTSample, 2000, 4000)),
				midTreble	: this.weightCheck(this.getFrequencyRange(FFTSample, 4000, 8000)),
				upperTreble	: this.weightCheck(this.getFrequencyRange(FFTSample, 8000, 16000))
			};

			//TEMP: DEBUG
			this.emit('beats', beats);

			//Checks
			this.checkBeats(beats);
			this.isLoudnessSpike(loudness);
			this.loudnessFactor(loudness);
		}
	};

	this.checkBeats			= function (weightedBeats) {
		for(var i in weightedBeats){
			if(weightedBeats.hasOwnProperty(i)){
				var weight = weightedBeats[i];

				if(weight) this.emit(i, weightedBeats[i]);
			}
		}
	};

	this.loudnessFactor = function ( loudness ){
		var min = Math.min.apply(Math, this.loudnessBuffer.getByTime(timeMS)),
			max = Math.max.apply(Math, this.loudnessBuffer.getByTime(timeMS));

		this.emit('loudnessFactor', this.range(min, max, loudness));
	};

	this.toBandSample	= function (FFTSample, bands){
		var band, sample, value, bandSample = [];

		//console.log(FFTSample);

		bands.forEach(function (band){
			sample = self.getFrequencyRange(FFTSample, band[0], band[1], true);

			if(sample.length){
				value = sample.reduce(function (prev, cur, index, array){
					if(index === array.length-1){
						return {db: (prev.db+cur.db)/array.length};
					} else {
						return {db: prev.db + cur.db};
					}
				});

				bandSample.push(value);
			}
		});

		return bandSample;
	};

	this.weightCheck		 = function ( FFTSegment ) {
		var deviations	= 0;

		FFTSegment.forEach(function (item){
			if(item.db > item.mean+item.standardDeviation) deviations++;
		});

		if(deviations){
			var weight = this.range(0, FFTSegment.length, deviations);

			return Math.round(weight*100)/100;
		}

		return false;
	};

	this.getFrequencyRange = function (FFTSample, start, end, freqRange){
		if(freqRange == null) {
			freqRange = false;
		}

		return FFTSample.filter(function (item){
			if(freqRange){
				if(item.freq[0] >= start && item.freq[1] <= end) return item;
			} else {
				if(item.freq >= start && item.freq <= end) return item;
			}
		});
	};

	this.analyseBands = function(){
		var bandBeats, totalBands = [], prev, next, peaks = [];

		this.bandBuffer.buffer.forEach(function (bands, index){
			bands.forEach(function (band, innerIndex){
				if(totalBands[innerIndex] == null) {
					totalBands[innerIndex] = [];
				}

				totalBands[innerIndex].push(band.db);
			});
		});

		bandBeats = totalBands.map(function (bands){
			return bands.map(function (band, index, array){
				if(array[index-1]){
					if(band > array[index-1])
						return true;
					else
						return false;

				} else {
					return false;
				}
			});
		});

		bandBeats = bandBeats.map(function (bands){
			return bands.map(function (band, index, array){
				if(band && array[index+1]){
					return false;
				} else {
					return band;
				}
			});
		});

		this.emit('bandBeats', bandBeats);
	};

	this.isLoudnessSpike = function( loudness ){
		var buffer 		= this.loudnessBuffer.getByTime(timeMS),
			mean 		= buffer.reduce(function (prev, cur, index, array){
				if(index === array.length-1)
					return (prev+cur)/array.length;
				else
					return prev+cur;
			}),
			meanDiff	= buffer.map(function (item){
				return item-mean;
			}),
			variance	= meanDiff.reduce(function (prev, cur, index, array){
				if(index === array.length-1)
					return (prev+Math.pow(cur, 2))/array.length;
				else
					return prev+Math.pow(cur, 2);
			}),
			standardDeviation	= Math.sqrt(variance),
			time 				= new Date().getTime();

		if(loudness > mean+standardDeviation && time-this.lastSpike > 100) {
			this.lastSpike = time;

			this.emit('loudnessSpike', loudness);
		}
	};

	this.activeSample = function ( FFTSample ){
		return FFTSample.filter(function ( FFTBin ){
			if(FFTBin.db > FFTBin.standardDeviation+FFTBin.mean) return FFTBin;
		});
	};

	this.range = function (min, max, value){
	 	return (value-min)/(max-min);
	};

	this.getLoudness = function ( FFTSample ){
		if(!FFTSample.length) return false;

		//RMS (Root-Mean-Square)
		var sumOfSqaures = FFTSample
			.map(function (item){
				if(Math.abs(item.db) === Infinity)
					return 0;
				else
					return item.db;
			})
			.reduce(function (prev, cur) {
				return (prev + cur*cur);
			});

		return Math.round(Math.sqrt(sumOfSqaures / FFTSample.length));
	};


	return this;
}

AudioAnalyser.prototype = Object.create(EventEmitter.prototype);

module.exports = AudioAnalyser;
