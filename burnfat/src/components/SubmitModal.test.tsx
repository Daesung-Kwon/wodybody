import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { burnfatTheme } from '../theme/theme';
import SubmitModal from './SubmitModal';
import { BODY_FAT_BLOCK_MESSAGE } from '../lib/bodyFatConsent';

const createSubmission = vi.fn();

vi.mock('../lib/roomApi', () => ({
  createSubmission: (...args: unknown[]) => createSubmission(...args),
}));

vi.mock('../lib/deviceSecret', () => ({
  prepareDeviceSecret: async () => ({
    hash: 'ab'.repeat(32),
    persist: () => undefined,
  }),
}));

vi.mock('../lib/analytics', () => ({
  track: () => undefined,
}));

function renderModal() {
  return render(
    <ThemeProvider theme={burnfatTheme}>
      <SubmitModal
        open
        challengeCode="AB12CD"
        participantId="p1"
        participantNickname="테스터"
        type="start"
        onClose={() => undefined}
        onSuccess={() => undefined}
      />
    </ThemeProvider>
  );
}

describe('SubmitModal body-fat consent', () => {
  beforeEach(() => {
    createSubmission.mockReset();
    window.localStorage.clear();
  });

  it('does not save a body-fat number without the consent checkbox', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('체지방률 (%)'), { target: { value: '28.4' } });
    fireEvent.click(screen.getByRole('button', { name: '제출' }));
    expect(await screen.findByText(BODY_FAT_BLOCK_MESSAGE)).toBeInTheDocument();
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('saves the number only after consent, still without a photo', async () => {
    createSubmission.mockResolvedValue({ id: 'sub-1' });
    renderModal();
    fireEvent.change(screen.getByLabelText('체지방률 (%)'), { target: { value: '28.4' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /체지방 정보를 수집·저장하는 데 동의합니다/ }));
    fireEvent.click(screen.getByRole('button', { name: '제출' }));
    await waitFor(() => expect(createSubmission).toHaveBeenCalledTimes(1));
    expect(createSubmission).toHaveBeenCalledWith(
      'AB12CD',
      expect.objectContaining({ bodyFatRate: 28.4, imagePath: null })
    );
    expect(window.localStorage.getItem('burnfat:body-fat-consent:p1')).toContain('consentedAt');
  });
});
