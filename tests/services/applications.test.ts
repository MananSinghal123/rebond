import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { saveApplication } from '@/lib/services/applications';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActor } from '../helpers/actors';

const FIELDS = {
  companyName: 'Northwind Health',
  description: 'Regional clinic network with contracted health-plan premiums.',
  amountUsd: '250000',
  ratePct: '11',
  termMonths: '12',
  payoutFrequency: 'QUARTERLY',
  contractSummary: 'Three-year capitation contract with a regional health plan.',
  annualRevenueUsd: '1800000',
};

const pdf = (name = 'contract.pdf') => ({ name, bytes: new TextEncoder().encode('%PDF-1.7 demo') });

describe('companies apply to raise a bond', () => {
  let company: Actor;

  beforeEach(async () => {
    await clearDatabase();
    company = await makeActor('COMPANY');
  });

  describe('when a valid application is submitted with a PDF', () => {
    it('stores it as SUBMITTED in cents and basis points, with the document', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [pdf()] }));
      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { documents: true, company: true } });
      expect(bond).toMatchObject({
        status: 'SUBMITTED',
        amountCents: 25_000_000,
        rateBps: 1100,
        termMonths: 12,
        payoutFrequency: 'QUARTERLY',
        annualRevenueCents: 180_000_000,
      });
      expect(bond.company.name).toBe('Northwind Health');
      expect(bond.documents.map((d) => d.name)).toEqual(['contract.pdf']);
    });
  });

  describe('when the application is saved as a draft', () => {
    it('keeps it in DRAFT', async () => {
      const result = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('when the fixed rate is above 30%', () => {
    it('rejects the application and creates no bond', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, ratePct: '30.5' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Rate must be 30% or less.' });
      expect(await db.bond.count()).toBe(0);
    });
  });

  describe('when the term is longer than 60 months', () => {
    it('rejects the application', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, termMonths: '61' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Term must be 1 to 60 months.' });
    });
  });

  describe('when the raise is below the $100 minimum ticket', () => {
    it('rejects the application so every listed bond can be filled', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, amountUsd: '99' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Raise amount must be at least $100, the minimum ticket.' });
    });
  });

  describe('when an uploaded file is not a PDF', () => {
    it('rejects the application and names the file', async () => {
      const fake = { name: 'contract.pdf', bytes: new TextEncoder().encode('MZ not a pdf') };
      const result = await saveApplication(company, { submit: true, fields: FIELDS, documents: [fake] });
      expect(result).toEqual({ ok: false, error: 'contract.pdf is not a PDF.' });
    });
  });

  describe('when a draft is edited and then submitted', () => {
    it('updates the same bond and moves it to SUBMITTED', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      unwrap(await saveApplication(company, { bondId, submit: true, fields: { ...FIELDS, ratePct: '10.5' }, documents: [] }));
      expect(await db.bond.findUniqueOrThrow({ where: { id: bondId } })).toMatchObject({ status: 'SUBMITTED', rateBps: 1050 });
      expect(await db.bond.count()).toBe(1);
    });
  });

  describe('when the application is already SUBMITTED', () => {
    it('refuses further edits', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [] }));
      const result = await saveApplication(company, { bondId, submit: true, fields: FIELDS, documents: [] });
      expect(result).toEqual({ ok: false, error: 'This application can no longer be edited.' });
    });
  });

  describe('when the company already has a bond submitted for review', () => {
    it('refuses to rename the company on a new application', async () => {
      unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [] }));
      const result = await saveApplication(company, {
        submit: false,
        fields: { ...FIELDS, companyName: 'Renamed Health' },
        documents: [],
      });
      expect(result).toEqual({ ok: false, error: 'Company details are locked while a bond is in review or listed.' });
      expect((await db.company.findUniqueOrThrow({ where: { ownerId: company.userId } })).name).toBe('Northwind Health');
    });
  });

  describe('when another company tries to edit the application', () => {
    it('treats the application as not found', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      const intruder = await makeActor('COMPANY');
      const result = await saveApplication(intruder, { bondId, submit: true, fields: FIELDS, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Application not found.' });
    });
  });
});
