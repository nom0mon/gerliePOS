import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

describe('App navigation', () => {
  it('renders the catalog page by default', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { name: /catalog/i })
    ).toBeInTheDocument();
  });

  it('navigates to checkout and reports via the bottom nav', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('link', { name: /checkout/i }));
    expect(
      screen.getByRole('heading', { name: /checkout/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /reports/i }));
    expect(
      screen.getByRole('heading', { name: /reports/i })
    ).toBeInTheDocument();
  });
});
