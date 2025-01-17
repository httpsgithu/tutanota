// @flow

export const KeyLength = Object.freeze({
	b128: "128",
	b256: "256"
})
export type KeyLengthEnum = $Values<typeof KeyLength>;

export type EntropySource =
	| "mouse"
	| "touch"
	| "key"
	| "random"
	| "static"
	| "time"
	| "accel"