export class Alarm {
	nextID: number;
	alarms: Map<number, NodeJS.Timeout>;
	
	constructor() {
		this.nextID = 0;
		this.alarms = new Map();
	}
	
	add(time: number, callback: () => void) {
		const now = Date.now();
		
		if (time < now) {
			throw new Error('Cannot create an Alarm for a past time!');
		}
		
		const id = this.nextID++;
		
		this.alarms.set(id, setTimeout(() => {
			callback();
		}, time - now));
		
		return id;
	}
	
	remove(id: number) {
		clearTimeout(this.alarms.get(id));
		
		this.alarms.delete(id);
	}
}
