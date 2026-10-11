import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition, curatorCanDecide, curatorCanView, EDITABLE_STATUSES } from '@/lib/domain/lifecycle';
import { BOND_STATUSES, parseEnum } from '@/lib/domain/types';

describe('bond lifecycle follows Apply → Curate → Fund → Settle', () => {
  describe('when a curator decides on an application in review', () => {
    it('allows listing, rejecting or requesting changes from IN_REVIEW', () => {
      expect(canTransition('IN_REVIEW', 'LISTED')).toBe(true);
      expect(canTransition('IN_REVIEW', 'REJECTED')).toBe(true);
      expect(canTransition('IN_REVIEW', 'CHANGES_REQUESTED')).toBe(true);
    });
  });

  describe('when a step would skip review', () => {
    it('refuses to list a bond straight from SUBMITTED', () => {
      expect(canTransition('SUBMITTED', 'LISTED')).toBe(false);
      expect(() => assertTransition('SUBMITTED', 'LISTED')).toThrow('SUBMITTED → LISTED');
    });
  });

  describe('when a company resubmits after changes were requested', () => {
    it('returns the application from CHANGES_REQUESTED to SUBMITTED', () => {
      expect(canTransition('CHANGES_REQUESTED', 'SUBMITTED')).toBe(true);
    });
  });

  describe('when a bond is funded', () => {
    it('moves LISTED to FUNDED to ACTIVE to MATURED and no other way', () => {
      expect(canTransition('LISTED', 'FUNDED')).toBe(true);
      expect(canTransition('FUNDED', 'ACTIVE')).toBe(true);
      expect(canTransition('ACTIVE', 'MATURED')).toBe(true);
      expect(canTransition('LISTED', 'ACTIVE')).toBe(false);
    });
  });

  describe('when a bond is REJECTED or MATURED', () => {
    it('allows no further transition from a terminal status', () => {
      for (const to of BOND_STATUSES) {
        expect(canTransition('REJECTED', to)).toBe(false);
        expect(canTransition('MATURED', to)).toBe(false);
      }
    });
  });

  describe('when a company opens an application to edit', () => {
    it('permits edits only in DRAFT and CHANGES_REQUESTED', () => {
      expect(EDITABLE_STATUSES).toEqual(['DRAFT', 'CHANGES_REQUESTED']);
    });
  });

  describe('when a curator opens an application', () => {
    it('shows queued applications and the curator\'s own claims, never other drafts or reviews', () => {
      expect(curatorCanView('SUBMITTED', false)).toBe(true);
      expect(curatorCanView('IN_REVIEW', true)).toBe(true);
      expect(curatorCanView('IN_REVIEW', false)).toBe(false);
      expect(curatorCanView('DRAFT', false)).toBe(false);
    });

    it('lets only the claiming curator decide, and only while IN_REVIEW', () => {
      expect(curatorCanDecide('IN_REVIEW', true)).toBe(true);
      expect(curatorCanDecide('IN_REVIEW', false)).toBe(false);
      expect(curatorCanDecide('SUBMITTED', true)).toBe(false);
    });
  });
});

describe('stored status strings are validated on read', () => {
  it('returns the typed status when the stored string is a known BondStatus', () => {
    expect(parseEnum(BOND_STATUSES, 'LISTED')).toBe('LISTED');
  });

  it('throws when the stored string is not a known BondStatus', () => {
    expect(() => parseEnum(BOND_STATUSES, 'PENDING')).toThrow('"PENDING"');
  });
});
