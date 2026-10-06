import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import MuiAboutPage from './MuiAboutPage';
import { ThemeProvider } from '../theme/ThemeProvider';

test('renders About page (frontend-branch port) and calls onBack', () => {
    const onBack = vi.fn();
    render(
        <ThemeProvider>
            <MuiAboutPage onBack={onBack} />
        </ThemeProvider>,
    );
    expect(screen.getByText('서비스 소개')).toBeInTheDocument();
    expect(screen.getByText('서비스 탄생 배경')).toBeInTheDocument();
    expect(screen.getByText('유성')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
});
