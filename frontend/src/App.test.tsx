import { render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';

test('renders login shell', async () => {
    render(
        <ThemeProvider>
            <App />
        </ThemeProvider>,
    );
    await waitFor(() => {
        expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    });
});
