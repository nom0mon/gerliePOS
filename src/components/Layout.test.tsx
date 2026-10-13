import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import { ADMIN_PIN, ADMIN_UNLOCK_KEY } from '../config/admin';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('Layout admin PIN gate', () => {
  it('prompts for a PIN when opening the admin menu', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /open admin menu/i }));
    expect(
      await screen.findByRole('dialog', { name: /enter admin pin/i })
    ).toBeInTheDocument();
  });

  it('rejects a wrong PIN and does not open the sidebar', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /open admin menu/i }));
    await user.type(await screen.findByLabelText(/^pin$/i), '0000');
    await user.click(screen.getByRole('button', { name: /unlock/i }));

    expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: /admin menu/i })
    ).not.toBeInTheDocument();
  });

  it('opens the admin sidebar with the correct PIN and stays unlocked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /open admin menu/i }));
    await user.type(await screen.findByLabelText(/^pin$/i), ADMIN_PIN);
    await user.click(screen.getByRole('button', { name: /unlock/i }));

    // Sidebar (dialog labelled "Admin menu") appears with section links.
    expect(
      await screen.findByRole('dialog', { name: /admin menu/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /transactions/i })
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(ADMIN_UNLOCK_KEY)).toBe('true');

    // Close, reopen → no PIN prompt this session, sidebar opens directly.
    await user.click(screen.getByRole('button', { name: /close admin menu/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /admin menu/i })
      ).not.toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /open admin menu/i }));
    expect(
      await screen.findByRole('dialog', { name: /admin menu/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: /enter admin pin/i })
    ).not.toBeInTheDocument();
  });
});
