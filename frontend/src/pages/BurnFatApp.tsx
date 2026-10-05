import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HomePage from '@burnfat/pages/HomePage';
import CreateChallengePage from '@burnfat/pages/CreateChallengePage';
import ChallengePage from '@burnfat/pages/ChallengePage';
import { burnfatTheme } from '@burnfat/theme/theme';

/**
 * BurnFat tree mounted at /burnfat/* (Capacitor + www.wodybody.com)
 * and at / on burnfat.wodybody.com.
 */
export default function BurnFatApp() {
    return (
        <ThemeProvider theme={burnfatTheme}>
            <CssBaseline />
            <Routes>
                <Route index element={<HomePage />} />
                <Route path="create" element={<CreateChallengePage />} />
                <Route path="c/:code" element={<ChallengePage />} />
                <Route path="*" element={<HomePage />} />
            </Routes>
        </ThemeProvider>
    );
}
