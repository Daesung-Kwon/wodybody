import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Stack, Paper, FormControlLabel,
    Checkbox, Radio, RadioGroup, Switch, FormControl, InputLabel,
    Select, MenuItem, TextField, Alert, CircularProgress, Divider, Chip,
} from './common/MuiComponents';
import { Save as SaveIcon, NotificationsActive as NotificationsIcon } from '@mui/icons-material';
import { UserPreferences } from '../types';
import { preferencesApi, pushApi } from '../utils/api';
import { ensureNativePushRegistered } from '../utils/native';

interface MuiPreferencesPageProps {
    goBack?: () => void;
}

const GOAL_OPTIONS: { value: string; label: string }[] = [
    { value: 'fat_loss', label: '체중 감량' },
    { value: 'muscle_gain', label: '근육 증가' },
    { value: 'conditioning', label: '컨디셔닝' },
    { value: 'mobility', label: '유연성/모빌리티' },
    { value: 'general_fitness', label: '전반적 건강' },
];

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
    { value: 'bodyweight', label: '맨몸' },
    { value: 'dumbbell', label: '덤벨' },
    { value: 'kettlebell', label: '케틀벨' },
    { value: 'barbell', label: '바벨' },
    { value: 'pullup_bar', label: '풀업바' },
    { value: 'rower', label: '로잉머신' },
];

const DURATION_OPTIONS = [10, 20, 30, 45, 60];

const MuiPreferencesPage: React.FC<MuiPreferencesPageProps> = () => {
    const [busy, setBusy] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [pref, setPref] = useState<UserPreferences>({
        goals: [],
        equipment: ['bodyweight'],
        available_minutes: 20,
        difficulty: 'intermediate',
        push_time: '09:00',
        timezone: 'Asia/Seoul',
        push_enabled: true,
    });

    const load = async () => {
        setBusy(true);
        setError(null);
        try {
            const data = await preferencesApi.get();
            setPref({
                goals: Array.isArray(data.goals) ? data.goals : [],
                equipment: Array.isArray(data.equipment) ? data.equipment : ['bodyweight'],
                available_minutes: data.available_minutes ?? 20,
                difficulty: (data.difficulty as any) || 'intermediate',
                push_time: data.push_time || '09:00',
                timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
                push_enabled: data.push_enabled ?? true,
            });
        } catch (e: any) {
            setError(e?.message || '선호 정보를 불러오지 못했습니다');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleArrayValue = (key: 'goals' | 'equipment', value: string) => {
        setPref(prev => {
            const list = prev[key];
            const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
            return { ...prev, [key]: next };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setInfo(null);
        try {
            const saved = await preferencesApi.update({
                goals: pref.goals,
                equipment: pref.equipment,
                available_minutes: pref.available_minutes,
                difficulty: pref.difficulty,
                push_time: pref.push_time,
                timezone: pref.timezone,
                push_enabled: pref.push_enabled,
            });
            setPref(prev => ({ ...prev, ...saved }));
            setInfo('선호도가 저장되었습니다.');

            if (pref.push_enabled) {
                try {
                    const reg = await ensureNativePushRegistered();
                    if (reg && reg.token) {
                        await pushApi.register({
                            platform: reg.platform,
                            token: reg.token,
                            app_version: reg.appVersion,
                        });
                    }
                } catch (pushErr) {
                    console.warn('push register skipped:', pushErr);
                }
            }
        } catch (e: any) {
            setError(e?.message || '저장에 실패했습니다');
        } finally {
            setSaving(false);
        }
    };

    if (busy) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                선호도 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                AI 코치가 매일 추천에 활용합니다. 언제든 변경 가능해요.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>목표</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {GOAL_OPTIONS.map(opt => (
                        <Chip
                            key={opt.value}
                            label={opt.label}
                            color={pref.goals.includes(opt.value) ? 'primary' : 'default'}
                            variant={pref.goals.includes(opt.value) ? 'filled' : 'outlined'}
                            onClick={() => toggleArrayValue('goals', opt.value)}
                            sx={{ fontWeight: 500 }}
                        />
                    ))}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>사용 가능한 기구</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {EQUIPMENT_OPTIONS.map(opt => (
                        <Chip
                            key={opt.value}
                            label={opt.label}
                            color={pref.equipment.includes(opt.value) ? 'primary' : 'default'}
                            variant={pref.equipment.includes(opt.value) ? 'filled' : 'outlined'}
                            onClick={() => toggleArrayValue('equipment', opt.value)}
                            sx={{ fontWeight: 500 }}
                        />
                    ))}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    하루 가용 시간
                </Typography>
                <RadioGroup
                    row
                    value={String(pref.available_minutes)}
                    onChange={(e) => setPref({ ...pref, available_minutes: parseInt(e.target.value, 10) })}
                >
                    {DURATION_OPTIONS.map(m => (
                        <FormControlLabel key={m} value={String(m)} control={<Radio />} label={`${m}분`} />
                    ))}
                </RadioGroup>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>난이도 선호</Typography>
                <RadioGroup
                    row
                    value={pref.difficulty}
                    onChange={(e) => setPref({ ...pref, difficulty: e.target.value as UserPreferences['difficulty'] })}
                >
                    <FormControlLabel value="beginner" control={<Radio />} label="초급" />
                    <FormControlLabel value="intermediate" control={<Radio />} label="중급" />
                    <FormControlLabel value="advanced" control={<Radio />} label="상급" />
                </RadioGroup>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <NotificationsIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>일일 푸시 알림</Typography>
                </Stack>

                <FormControlLabel
                    control={
                        <Switch
                            checked={!!pref.push_enabled}
                            onChange={(e) => setPref({ ...pref, push_enabled: e.target.checked })}
                        />
                    }
                    label="매일 푸시 알림 받기"
                />

                <Divider sx={{ my: 2 }} />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl sx={{ minWidth: 140 }} size="small">
                        <InputLabel>푸시 시각</InputLabel>
                        <Select
                            label="푸시 시각"
                            value={pref.push_time}
                            onChange={(e) => setPref({ ...pref, push_time: String(e.target.value) })}
                            disabled={!pref.push_enabled}
                        >
                            {['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'].map(t => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        label="Timezone"
                        value={pref.timezone}
                        onChange={(e) => setPref({ ...pref, timezone: e.target.value })}
                        helperText="예: Asia/Seoul"
                        sx={{ minWidth: 220 }}
                    />
                </Stack>
            </Paper>

            <Stack direction="row" justifyContent="flex-end">
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '저장 중…' : '저장'}
                </Button>
            </Stack>
        </Box>
    );
};

export default MuiPreferencesPage;
