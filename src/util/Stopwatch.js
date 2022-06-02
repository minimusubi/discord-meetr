export default class Stopwatch {
	constructor() {
		this.reset();
	}
	
	start() {
		if (this.time === null) {
			this.time = Date.now();
		}
	}
	
	stop() {
		this.duration += this._getRunningDuration();
		this.time = null;
		
		return this.getTime();
	}
	
	reset() {
		this.duration = 0;
		this.time = null;
	}
	
	_getRunningDuration() {
		if (this.time !== null) {
			return Date.now() - this.time;
		}
		
		return 0;
	}
	
	getTime() {
		return this.duration + this._getRunningDuration();
	}
}
