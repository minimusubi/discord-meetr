export function pluralize(noun: string, count: number) {
	return `${noun}${count < 1 || count > 1 ? 's' : ''}`;
}
