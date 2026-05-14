import {
  ADVISORY_ACK_TTL_MS,
  acknowledgedIdSet,
  pruneAcks,
  withAck,
  type AdvisoryAckMap,
} from '@/src/storage/advisory-acks';

describe('advisory-acks', () => {
  const now = new Date('2026-05-14T12:00:00.000Z');
  const justInside = new Date(now.getTime() - ADVISORY_ACK_TTL_MS + 60_000).toISOString();
  const justOutside = new Date(now.getTime() - ADVISORY_ACK_TTL_MS - 60_000).toISOString();

  describe('pruneAcks', () => {
    it('keeps acknowledgements inside the 24h TTL', () => {
      const acks: AdvisoryAckMap = { 'gear-due-soon': justInside };
      expect(pruneAcks(acks, now)).toEqual({ 'gear-due-soon': justInside });
    });

    it('drops acknowledgements past the 24h TTL', () => {
      const acks: AdvisoryAckMap = { 'gear-due-soon': justOutside };
      expect(pruneAcks(acks, now)).toEqual({});
    });

    it('drops malformed timestamps so a corrupt entry cannot pin an advisory hidden', () => {
      const acks: AdvisoryAckMap = { 'cert-sprat': 'not-a-date', 'gear-due-soon': justInside };
      expect(pruneAcks(acks, now)).toEqual({ 'gear-due-soon': justInside });
    });

    it('returns an empty map unchanged', () => {
      expect(pruneAcks({}, now)).toEqual({});
    });
  });

  describe('acknowledgedIdSet', () => {
    it('returns only the still-valid ids', () => {
      const acks: AdvisoryAckMap = {
        'gear-due-soon': justInside,
        'cert-sprat-l2': justOutside,
      };
      const set = acknowledgedIdSet(acks, now);
      expect(set.has('gear-due-soon')).toBe(true);
      expect(set.has('cert-sprat-l2')).toBe(false);
      expect(set.size).toBe(1);
    });
  });

  describe('withAck', () => {
    it('records a fresh acknowledgement at now', () => {
      const next = withAck({}, 'gear-due-soon', now);
      expect(next['gear-due-soon']).toBe(now.toISOString());
    });

    it('prunes expired entries while adding the new one', () => {
      const acks: AdvisoryAckMap = { 'cert-sprat-l2': justOutside };
      const next = withAck(acks, 'gear-due-soon', now);
      expect(next).toEqual({ 'gear-due-soon': now.toISOString() });
    });

    it('refreshes the timestamp when re-acknowledging the same id', () => {
      const acks: AdvisoryAckMap = { 'gear-due-soon': justInside };
      const next = withAck(acks, 'gear-due-soon', now);
      expect(next['gear-due-soon']).toBe(now.toISOString());
    });
  });
});
