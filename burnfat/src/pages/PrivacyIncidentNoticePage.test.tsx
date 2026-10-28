import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { burnfatTheme } from '../theme/theme';
import PrivacyIncidentNoticePage from './PrivacyIncidentNoticePage';

describe('privacy incident notice', () => {
  it('covers the required disclosure points and does not name people', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={burnfatTheme}>
          <PrivacyIncidentNoticePage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: '개인정보 노출 가능성 안내' })).toBeInTheDocument();
    expect(screen.getAllByText(/인바디/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/닉네임/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2026-02-23/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-06/)).toBeInTheDocument();
    expect(screen.getByText(/저장소 권한 설정/)).toBeInTheDocument();
    expect(screen.getByText(/확인된 제3자 접근은 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-19/)).toBeInTheDocument();
    expect(screen.getByText(/숫자만 받습니다/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '문의' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@wodybody.com' })).toHaveAttribute(
      'href',
      'mailto:support@wodybody.com'
    );
    expect(screen.getByText(/열람, 정정, 삭제, 처리정지/)).toBeInTheDocument();
    expect(screen.getByText(/개별 이메일·문자·SNS로는 보내지 않습니다/)).toBeInTheDocument();
  });
});
