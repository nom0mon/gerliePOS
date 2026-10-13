import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../db/db';
import App from '../App';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(async () => {
  await db.menuItems.clear();
  await db.sales.clear();
});

describe('App navigation', () => {
  it('renders the checkout page by default', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { name: /checkout/i })
    ).toBeInTheDocument();
  });

  it('navigates to menu and reports via the bottom nav', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('link', { name: /menu/i }));
    expect(
      screen.getByRole('heading', { name: /menu/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /reports/i }));
    expect(
      screen.getByRole('heading', { name: /reports/i })
    ).toBeInTheDocument();
  });
});
