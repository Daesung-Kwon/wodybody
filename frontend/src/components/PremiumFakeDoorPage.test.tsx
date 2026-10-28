import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import PremiumFakeDoorPage from './PremiumFakeDoorPage';

describe('premium fake door', () => {
  it('shows the A price by default, the B price from the query, and does not post the email', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/premium']}>
          <PremiumFakeDoorPage />
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByRole('heading', { name: /혼자 하는 크로스핏식 WOD/ })).toBeInTheDocument();
    expect(screen.getAllByText(/₩4,900/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₩39,000/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/CrossFit/);

    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    expect(screen.getByRole('heading', { name: '준비 중입니다, 출시 알림 받기' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '출시 알림 받기' }));
    expect(await screen.findByText(/서버로 전송하지 않았습니다/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('premium fake door variant B', () => {
  it('shows ₩9,900 when variant=b', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pricing-test?variant=b']}>
          <PremiumFakeDoorPage />
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getAllByText(/₩9,900/).length).toBeGreaterThan(0);
  });
});
