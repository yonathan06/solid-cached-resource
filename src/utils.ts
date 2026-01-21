function hasObjectPrototype(o: unknown): boolean {
	return Object.prototype.toString.call(o) === "[object Object]";
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
export function isPlainObject(o: unknown): o is object {
	if (!hasObjectPrototype(o)) {
		return false;
	}

	// If has modified constructor
	const ctor = (o as object).constructor;
	if (typeof ctor === "undefined") {
		return true;
	}

	// If has modified prototype
	const prot = ctor.prototype;
	if (!hasObjectPrototype(prot)) {
		return false;
	}

	// If constructor does not have an Object-specific method
	if (!Object.hasOwn(prot, "isPrototypeOf")) {
		return false;
	}

	// Most likely a plain Object
	return true;
}

export function stringyValue(value: unknown) {
	return JSON.stringify(value, (_, val) =>
		isPlainObject(val)
			? Object.keys(val)
					.sort()
					.reduce((result, key) => {
						result[key] = (val as Record<string, unknown>)[key];
						return result;
					}, {} as Record<string, unknown>)
			: val,
	);
}
