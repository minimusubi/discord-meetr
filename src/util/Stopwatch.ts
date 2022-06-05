export interface StopwatchExport {
	duration: number,
	time: number,
}

export default class Stopwatch {
	duration: number;
	time: number | null;
	
	constructor() {
		this.duration = 0;
		this.time = null;
	}
	
	start(startTime?: number) {
		if (this.time === null) {
			this.time = startTime ?? Date.now();
		}
	}
	
	stop(stopTime?: number) {
		this.duration += this._getRunningDuration(stopTime);
		this.time = null;
		
		return this.getTime();
	}
	
	reset() {
		this.duration = 0;
		this.time = null;
	}
	
	_getRunningDuration(stopTime?: number) {
		if (this.time !== null) {
			return (stopTime ?? Date.now()) - this.time;
		}
		
		return 0;
	}
	
	getTime() {
		return this.duration + this._getRunningDuration();
	}
	
	export(): StopwatchExport {
		return {
			duration: this.getTime(),
			time: Date.now(),
		};
	}
}
