import { useState } from 'react';
import { api, formatRelative, useApi } from '../api';
import { Badge, Button, EmptyState, ErrorBox, Modal, PageHeader, SelectField, Spinner, TextField, useToast } from '../ui';

export const ROLES = {
  owner: { label: 'Inhaber', hint: 'Produkte, Kategorien, Events, Banner & Aktionen, Medien, Öffnungszeiten' },
  developer: { label: 'Entwickler', hint: 'Alles, inkl. Webseiteninhalte, Einstellungen, Benutzer und Datensicherung' },
};

function RoleField({ value, onChange, error, disabled }) {
  return (
    <SelectField
      label="Rolle"
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      hint={disabled ? 'Deine eigene Rolle kannst du nicht ändern.' : ROLES[value].hint}
    >
      {Object.entries(ROLES).map(([id, role]) => <option key={id} value={id}>{role.label}</option>)}
    </SelectField>
  );
}
import { Icon } from '../icons';

// Readable characters only (no 0/O, 1/l/I) — the password may be read out loud.
const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?#%+';
function generatePassword(length = 16) {
  const random = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(random, (n) => CHARS[n % CHARS.length]).join('');
}

function PasswordWithGenerator({ value, onChange, error, label = 'Passwort' }) {
  const toast = useToast();
  return (
    <>
      <TextField
        label={label}
        required
        type="text"
        autoComplete="new-password"
        spellCheck={false}
        value={value}
        onChange={onChange}
        error={error}
        hint="Mindestens 12 Zeichen. Teile es der Person auf sicherem Weg mit (persönlich, nicht per E-Mail)."
      />
      <div className="button-row password-tools">
        <Button variant="ghost" size="small" onClick={() => onChange(generatePassword())}><Icon name="refresh" size={15} /> Sicheres Passwort erzeugen</Button>
        {value && (
          <Button
            variant="ghost"
            size="small"
            onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success('Passwort kopiert.'), () => {})}
          >
            Kopieren
          </Button>
        )}
      </div>
    </>
  );
}

/** Dialog for create / set password / delete; all confirmed with the own password. */
function UserDialog({ mode, user, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: '', displayName: '', role: 'owner', password: '', currentPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const config = {
    create: { title: 'Neues Konto', button: 'Konto anlegen', success: 'Konto angelegt.' },
    password: { title: `Passwort für ${user?.email} setzen`, button: 'Passwort setzen', success: 'Passwort gesetzt — die Person wurde überall abgemeldet.' },
    delete: { title: 'Konto löschen?', button: 'Endgültig löschen', success: 'Konto gelöscht.' },
  }[mode];

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (mode === 'create') {
        await api('/admin/users', { method: 'POST', body: form });
      } else if (mode === 'password') {
        await api(`/admin/users/${user.id}/password`, { method: 'POST', body: { password: form.password, currentPassword: form.currentPassword } });
      } else {
        await api(`/admin/users/${user.id}`, { method: 'DELETE', body: { currentPassword: form.currentPassword } });
      }
      toast.success(config.success);
      onDone();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={config.title} onClose={onClose}>
      <form onSubmit={submit}>
        {mode === 'create' && (
          <>
            <p className="modal-intro">Lege fest, was die Person im Adminpanel sehen und bearbeiten darf.</p>
            <div className="field-row">
              <TextField label="Name" placeholder="z. B. Ali" value={form.displayName} onChange={set('displayName')} error={errors.displayName} maxLength={80} />
              <TextField label="E-Mail" required type="email" autoComplete="off" value={form.email} onChange={set('email')} error={errors.email} />
            </div>
            <RoleField value={form.role} onChange={set('role')} error={errors.role} />
          </>
        )}
        {(mode === 'create' || mode === 'password') && (
          <PasswordWithGenerator label={mode === 'create' ? 'Passwort' : 'Neues Passwort'} value={form.password} onChange={set('password')} error={errors.password} />
        )}
        {mode === 'delete' && (
          <p className="confirm-text">
            <strong>{user.displayName || user.email}</strong> ({user.email}) kann sich danach nicht mehr anmelden. Die Einträge im
            Änderungsprotokoll bleiben erhalten.
          </p>
        )}
        <div className="confirm-own">
          <TextField
            label="Zur Bestätigung: dein eigenes Passwort"
            required
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            error={errors.currentPassword}
          />
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant={mode === 'delete' ? 'danger' : 'primary'} busy={busy}>{config.button}</Button>
        </div>
      </form>
    </Modal>
  );
}

function NameDialog({ user, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ displayName: user.displayName, email: user.email, role: user.role });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { role, ...rest } = form;
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: user.isSelf ? rest : form });
      toast.success('Gespeichert.');
      onDone();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Konto bearbeiten" onClose={onClose}>
      <form onSubmit={submit}>
        <TextField label="Name" value={form.displayName} onChange={(displayName) => setForm((f) => ({ ...f, displayName }))} error={errors.displayName} maxLength={80} />
        <TextField label="E-Mail (Anmeldename)" required type="email" value={form.email} onChange={(email) => setForm((f) => ({ ...f, email }))} error={errors.email} />
        <RoleField value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} error={errors.role} disabled={user.isSelf} />
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy}>Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { data, error, loading, reload } = useApi('/admin/users');
  const [dialog, setDialog] = useState(null);
  const done = () => {
    setDialog(null);
    reload();
  };
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Benutzer"
        description="Wer sich im Adminpanel anmelden darf. Inhaber sehen nur das Tagesgeschäft, Entwickler alles."
        actions={<Button onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" size={16} /> Neues Konto</Button>}
      />
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState icon="users" title="Keine Konten" />
      ) : (
        <ul className="list">
          {items.map((user) => (
            <li key={user.id} className="list-row">
              <div className="row-title">
                <span className="thumb">{(user.displayName || user.email)[0].toUpperCase()}</span>
                <span>
                  <strong>{user.displayName || user.email}</strong>
                  <small>{user.email}</small>
                  <span className="badges">
                    {user.isSelf && <Badge tone="accent">Du</Badge>}
                    <Badge tone={user.role === 'developer' ? 'success' : 'neutral'}>{ROLES[user.role]?.label ?? user.role}</Badge>
                    <Badge>
                      {user.lastLoginAt ? `Zuletzt angemeldet ${formatRelative(user.lastLoginAt)}` : 'Noch nie angemeldet'}
                    </Badge>
                  </span>
                </span>
              </div>
              <div className="row-actions">
                <Button variant="ghost" size="small" onClick={() => setDialog({ mode: 'name', user })}>Bearbeiten</Button>
                {user.isSelf ? (
                  <a className="a-btn a-btn-ghost a-btn-small" href="#/passwort">Mein Passwort ändern</a>
                ) : (
                  <>
                    <Button variant="ghost" size="small" onClick={() => setDialog({ mode: 'password', user })}>Passwort setzen</Button>
                    <Button variant="icon" size="small" onClick={() => setDialog({ mode: 'delete', user })} title="Löschen" aria-label={`${user.email} löschen`}><Icon name="trash" size={16} /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog?.mode === 'name' && <NameDialog user={dialog.user} onClose={() => setDialog(null)} onDone={done} />}
      {dialog && dialog.mode !== 'name' && <UserDialog mode={dialog.mode} user={dialog.user} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
}
