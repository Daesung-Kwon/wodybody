import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';

test('renders login shell', () => {
    render(
        <ThemeProvider>
            <App />
        </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
});
