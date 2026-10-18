import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ADMIN_UNLOCK_KEY } from '../config/admin';

/**
 * Admin route gating in LOCAL mode (Supabase not configured in tests, so
 * cloudEnabled=false and the operator is treated as a local owner). The soft
 * PIN still protects /admin/* on a shared offline device.
 */
beforeEach(() => {
  sessionStorage.clear();
});

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('admin route gating (local mode)', () => {
  it('redirects away from /admin/products when the PIN is not unlocked', async () => {
    renderAppAt('/admin/products');
    // Redirected to checkout (index): the Pay/charge button exists there, the
    // "Products" admin heading does not.
    expect(
      screen.queryByRole('heading', { name: /^products$/i })
    ).not.toBeInTheDocument();
  });

  it('allows /admin/products when the session PIN flag is set', async () => {
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, 'true');
    renderAppAt('/admin/products');
    expect(
      await screen.findByRole('heading', { name: /^products$/i })
    ).toBeInTheDocument();
  });
});
