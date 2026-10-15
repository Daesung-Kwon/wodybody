/**
 * NTP-style offset between this device's Date.now() and the server clock.
 *
 * For one sample:
 *   offset = serverTime - (clientSend + clientRecv) / 2
 * Symmetric delay cancels. The remaining error is half the one-way asymmetry.
 *
 * Several samples are taken. The sample with the lowest RTT is kept
 * (classic NTP). When several share that RTT, their offsets are median-combined.
 * Add `offsetMs` to Date.now() to estimate server time.
 */

export interface TimeSample {
    clientSendMs: number;
    clientRecvMs: number;
    serverTimeMs: number;
}

export interface OffsetEstimate {
    offsetMs: number;
    rttMs: number;
    samplesUsed: number;
}

interface ParsedSample {
    rttMs: number;
    offsetMs: number;
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function parseSample(sample: TimeSample): ParsedSample | null {
    const rttMs = sample.clientRecvMs - sample.clientSendMs;
    if (!Number.isFinite(rttMs) || rttMs < 0) return null;
    if (!Number.isFinite(sample.serverTimeMs)) return null;
    const offsetMs = sample.serverTimeMs - (sample.clientSendMs + sample.clientRecvMs) / 2;
    return { rttMs, offsetMs };
}

export function estimateOffset(samples: TimeSample[]): OffsetEstimate {
    const parsed = samples
        .map(parseSample)
        .filter((row): row is ParsedSample => row !== null);
    if (parsed.length === 0) {
        throw new Error('clock sync needs at least one valid sample');
    }
    const bestRtt = Math.min(...parsed.map((row) => row.rttMs));
    const best = parsed.filter((row) => row.rttMs === bestRtt);
    return {
        offsetMs: median(best.map((row) => row.offsetMs)),
        rttMs: bestRtt,
        samplesUsed: best.length,
    };
}

export function estimateServerNow(clientNowMs: number, offsetMs: number): number {
    return clientNowMs + offsetMs;
}

export function remainingMs(args: {
    clientNowMs: number;
    offsetMs: number;
    startedAtMs: number;
    durationSec: number;
}): number {
    const serverNow = estimateServerNow(args.clientNowMs, args.offsetMs);
    return args.startedAtMs + args.durationSec * 1000 - serverNow;
}

export function formatCountdown(remaining: number): string {
    const clamped = Math.max(0, remaining);
    const totalTenths = Math.floor(clamped / 100);
    const tenths = totalTenths % 10;
    const totalSec = Math.floor(totalTenths / 10);
    const seconds = totalSec % 60;
    const minutes = Math.floor(totalSec / 60);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}.${tenths}`;
}

export function formatElapsed(elapsedMs: number): string {
    return formatCountdown(elapsedMs);
}
