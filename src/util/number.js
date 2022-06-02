export function pluralize(noun, count) {
	return `${noun}${count < 1 || count > 1 ? 's' : ''}`;
}
