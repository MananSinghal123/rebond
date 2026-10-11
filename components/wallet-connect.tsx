'use client';

import { useEffect, useState } from 'react';
import { finishWalletSignIn, startWalletSignIn } from '@/app/(app)/login/actions';
import { finishWalletLink, startWalletLink } from '@/app/(app)/wallet-actions';
import { Button, Notice } from '@/components/ui';

type Cip30Api = {
  getUsedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  signData(address: string, payloadHex: string): Promise<{ signature: string; key: string }>;
};

type Cip30Wallet = { name: string; icon: string; apiVersion: string; enable(): Promise<Cip30Api> };

declare global {
  interface Window {
    cardano?: Record<string, Cip30Wallet | undefined>;
  }
}

type DetectedWallet = { id: string; name: string; icon: string };

type Status =
  | { kind: 'detecting' }
  | { kind: 'idle' }
  | { kind: 'signing'; name: string }
  | { kind: 'linked' }
  | { kind: 'error'; message: string };

const WALLET_DETECTION_DELAY_MS = 600;

const toHex = (text: string) =>
  Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, '0')).join('');

function detectWallets(): DetectedWallet[] {
  const injected = window.cardano ?? {};
  const seen = new Set<string>();
  return Object.entries(injected).flatMap(([id, wallet]) => {
    if (!wallet?.apiVersion || typeof wallet.enable !== 'function' || seen.has(wallet.name)) return [];
    seen.add(wallet.name);
    return [{ id, name: wallet.name, icon: wallet.icon }];
  });
}

const friendlyError = (error: unknown) => {
  const text = error instanceof Error ? error.message : String((error as { info?: string })?.info ?? error);
  return /declin|reject|cancel|refus/i.test(text) ? 'You declined the request in your wallet.' : 'The wallet could not complete the request. Please try again.';
};

export function WalletConnect({ mode, next = '' }: { mode: 'sign-in' | 'link'; next?: string }) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'detecting' });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWallets(detectWallets());
      setStatus({ kind: 'idle' });
    }, WALLET_DETECTION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  async function connect(wallet: DetectedWallet) {
    setStatus({ kind: 'signing', name: wallet.name });
    try {
      const api = await window.cardano![wallet.id]!.enable();
      const [used] = await api.getUsedAddresses();
      const addressHex = used ?? (await api.getChangeAddress());
      const message = mode === 'sign-in' ? await startWalletSignIn() : await startWalletLink();
      const { signature, key } = await api.signData(addressHex, toHex(message));
      const proof = { addressHex, signature, key };
      const result = mode === 'sign-in' ? await finishWalletSignIn(proof, next) : await finishWalletLink(proof);
      if ('error' in result) return setStatus({ kind: 'error', message: result.error });
      setStatus({ kind: 'linked' });
    } catch (error) {
      setStatus({ kind: 'error', message: friendlyError(error) });
    }
  }

  if (status.kind === 'detecting') return <p className="text-[13px] text-muted">Looking for Cardano wallets…</p>;
  if (status.kind === 'linked') return <Notice tone="success">Wallet connected.</Notice>;

  if (wallets.length === 0) {
    return (
      <p className="text-[13px] text-muted">
        No Cardano wallet found in this browser. Install{' '}
        <a href="https://www.lace.io" target="_blank" rel="noreferrer" className="text-accent hover:underline">Lace</a> or{' '}
        <a href="https://eternl.io" target="_blank" rel="noreferrer" className="text-accent hover:underline">Eternl</a>, then reload.
      </p>
    );
  }

  return (
    <div className="grid gap-2.5">
      {wallets.map((wallet) => (
        <Button
          key={wallet.id}
          type="button"
          variant="secondary"
          className="justify-start gap-3 px-3.5 sm:h-10"
          disabled={status.kind === 'signing'}
          onClick={() => connect(wallet)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs injected by the extension */}
          <img src={wallet.icon} alt="" width={22} height={22} className="rounded-[4px]" />
          {status.kind === 'signing' && status.name === wallet.name ? 'Waiting for signature…' : `Continue with ${wallet.name}`}
        </Button>
      ))}
      {status.kind === 'error' && <Notice>{status.message}</Notice>}
      <p className="text-[12px] text-muted">You sign a one-time message to prove you own the wallet. No transaction, no fee.</p>
    </div>
  );
}
