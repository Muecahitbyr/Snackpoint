import { useState } from 'react';
import { api } from '../api';
import { Button, Card, PageHeader, TextField, useToast } from '../ui';

function strength(password) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return ['Sehr schwach', 'Schwach', 'Okay', 'Gut', 'Stark', 'Sehr stark'][score];
}

export default function Password() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    if (form.newPassword !== form.repeat) {
      setErrors({ repeat: 'Die Passwörter stimmen nicht überein.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api('/auth/password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setForm({ currentPassword: '', newPassword: '', repeat: '' });
      toast.success('Passwort geändert. Andere Geräte wurden abgemeldet.');
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Passwort ändern" description="Nach der Änderung werden alle anderen angemeldeten Geräte automatisch abgemeldet." />
      <Card className="narrow">
        <form onSubmit={submit}>
          <TextField label="Aktuelles Passwort" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
          <TextField
            label="Neues Passwort"
            type="password"
            autoComplete="new-password"
            required
            value={form.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            hint={form.newPassword ? `Stärke: ${strength(form.newPassword)} · mindestens 12 Zeichen` : 'Mindestens 12 Zeichen. Tipp: ein Satz aus mehreren Wörtern.'}
          />
          <TextField label="Neues Passwort wiederholen" type="password" autoComplete="new-password" required value={form.repeat} onChange={set('repeat')} error={errors.repeat} />
          <Button type="submit" busy={busy}>Passwort ändern</Button>
        </form>
      </Card>
      <p className="hint-bar subtle">Passwort vergessen? Es kann sicher über die Kommandozeile zurückgesetzt werden (siehe ADMIN.md, „Passwort zurücksetzen“).</p>
    </>
  );
}
