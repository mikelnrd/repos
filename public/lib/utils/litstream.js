import { ReadableStream, Response } from "../env.js";

const isArray = (value) => Array.isArray(value);
const isAsyncIterator = (value) => (value != null && typeof value[Symbol.asyncIterator] === "function");
const isSyncIterator = (value) => (value != null && typeof value[Symbol.iterator] === "function");

async function* y(v) {
    if (v instanceof Uint8Array) {
        yield v;
        return;
    }
    if (typeof v === "string") {
        yield v;
    } else if (isArray(v)) {
        for (const x of v) {
            yield* y(x);
        }
    } else if (isAsyncIterator(v)) {
        for await (const value of v) {
            yield* y(value);
        }
    } else if (isSyncIterator(v)) {
        for (const value of v) {
            yield* y(value);
        }
    } else {
        yield v;
    }
}

export async function* html(literals, ...values) {
    for (let i = 0; i < values.length; i++) {
        if (literals[i].length > 0) {
            yield literals[i];
        }
        yield* y(values[i]);
    }
    yield literals[literals.length - 1];
    return;
}

function getStreamFromSource(source) {
    if (source instanceof Response) {
        return source.body;
    }
    if (source instanceof ReadableStream) {
        return source;
    }
    return new Response(source).body;
}

async function* convert(iterator) {
    while (true) {
        const result = await iterator.next();
        if (result.done) break;
        if (result.value instanceof Uint8Array) {
            yield result.value;
        } else {
            yield getStreamFromSource(await result.value);
        }
    }
}

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

function toReadableStream(iterator) {
    const streamDeferred = new Deferred();
    const stream = new ReadableStream({
        async pull(controller) {
            try {
                const result = await iterator.next();
                if (result.done) {
                    controller.close();
                    streamDeferred.resolve();
                }
                else {
                    const value = result.value;
                    if (value instanceof ReadableStream) {
                        const reader = value.getReader();
                        while (true) {
                            const result = await reader.read();
                            if (result.done)
                                break;
                            controller.enqueue(result.value);
                        }
                    }
                    else {
                        controller.enqueue(value);
                    }
                }
            }
            catch (err) {
                streamDeferred.reject(err);
                throw err;
            }
        },
        cancel() {
            streamDeferred.resolve();
        }
    });
    return { done: streamDeferred.promise, stream };
}

export function toResponse(iterator, init) {
    const { stream } = toReadableStream(convert(iterator));
    return new Response(stream, init);
}

export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}