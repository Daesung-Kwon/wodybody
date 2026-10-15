import { describe, expect, it } from 'vitest';
import { estimateOffset, estimateServerNow, remainingMs, type TimeSample } from './clockSync';

interface Link {
    forwardMs: number;
    backMs: number;
}

/**
 * One NTP exchange against a true server clock.
 * Client wall clock = true time + skew.
 * Server stamps time when the request arrives (after the forward delay).
 */
function simulateSample(args: {
    trueServerMs: number;
    skewMs: number;
    link: Link;
}): TimeSample {
    const clientSendMs = args.trueServerMs + args.skewMs;
    const serverTimeMs = args.trueServerMs + args.link.forwardMs;
    const clientRecvMs = clientSendMs + args.link.forwardMs + args.link.backMs;
    return { clientSendMs, clientRecvMs, serverTimeMs };
}

function samplesFor(skewMs: number, links: Link[], true0 = 1_700_000_000_000): TimeSample[] {
    return links.map((link, index) => simulateSample({
        trueServerMs: true0 + index * 1000,
        skewMs,
        link,
    }));
}

describe('estimateOffset', () => {
    it('picks the lowest RTT sample and ignores a slow asymmetric outlier', () => {
        const samples = samplesFor(0, [
            { forwardMs: 200, backMs: 20 },
            { forwardMs: 30, backMs: 36 },
            { forwardMs: 80, backMs: 220 },
        ]);
        const estimate = estimateOffset(samples);
        expect(estimate.rttMs).toBe(66);
        // error = (forward - back) / 2 = (30 - 36) / 2
        expect(estimate.offsetMs).toBe(-3);
        expect(estimate.samplesUsed).toBe(1);
    });

    it('keeps two clients within ±250 ms under simulated skew and latency', () => {
        // Mobile-like links. Each client also has a large, slow, asymmetric
        // sample that must not be selected. Skews differ by 400 ms.
        const linksA: Link[] = [
            { forwardMs: 80, backMs: 220 },
            { forwardMs: 40, backMs: 50 },
            { forwardMs: 200, backMs: 20 },
            { forwardMs: 30, backMs: 36 },
            { forwardMs: 100, backMs: 100 },
        ];
        const linksB: Link[] = [
            { forwardMs: 15, backMs: 45 },
            { forwardMs: 90, backMs: 40 },
            { forwardMs: 300, backMs: 10 },
            { forwardMs: 50, backMs: 70 },
            { forwardMs: 20, backMs: 80 },
        ];
        const skewA = 180;
        const skewB = -220;
        const offsetA = estimateOffset(samplesFor(skewA, linksA)).offsetMs;
        const offsetB = estimateOffset(samplesFor(skewB, linksB)).offsetMs;

        const trueNow = 1_700_000_123_456;
        const estimateA = estimateServerNow(trueNow + skewA, offsetA);
        const estimateB = estimateServerNow(trueNow + skewB, offsetB);
        const delta = Math.abs(estimateA - estimateB);

        // Best samples: A (30, 36) error -3 ms, B (15, 45) error -15 ms. Delta = 12 ms.
        expect(delta, `measured inter-client server-time delta ${delta}ms`).toBeLessThanOrEqual(250);
        expect(delta).toBe(12);
    });

    it('renders the same remaining time for both clients from one server started_at', () => {
        const linksA: Link[] = [{ forwardMs: 30, backMs: 36 }];
        const linksB: Link[] = [{ forwardMs: 15, backMs: 45 }];
        const skewA = 180;
        const skewB = -220;
        const offsetA = estimateOffset(samplesFor(skewA, linksA)).offsetMs;
        const offsetB = estimateOffset(samplesFor(skewB, linksB)).offsetMs;
        const startedAtMs = 1_700_000_000_000;
        const trueNow = startedAtMs + 125_000;
        const leftA = remainingMs({
            clientNowMs: trueNow + skewA,
            offsetMs: offsetA,
            startedAtMs,
            durationSec: 600,
        });
        const leftB = remainingMs({
            clientNowMs: trueNow + skewB,
            offsetMs: offsetB,
            startedAtMs,
            durationSec: 600,
        });
        expect(Math.abs(leftA - leftB)).toBeLessThanOrEqual(250);
        expect(Math.abs(leftA - leftB)).toBe(12);
    });
});
