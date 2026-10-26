import { useEffect, useState } from 'react';
import { api, formatDateTime, useApi } from '../api';
import { Button, Card, ErrorBox, PageHeader, Spinner, TextField, Toggle, useToast } from '../ui';
import { formatRelative } from '../api';
import { describeChange } from './Dashboard';

/** One settings card that saves its own topic (PUT /admin/settings/:key). */
function SettingsCard({ title, description, settingKey, initial, toBody = (form) => form, children }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await api(`/admin/settings/${settingKey}`, { method: 'PUT', body: toBody(form) });
      setSaved(form);
      toast.success(`${title} gespeichert.`);
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={title} description={description}>
      {children({ form, set, errors })}
      <div className="card-foot">
        {changed && <Button variant="ghost" size="small" onClick={() => setForm(saved)}>Verwerfen</Button>}
        <Button size="small" busy={busy} disabled={!changed} onClick={save}>Speichern</Button>
      </div>
    </Card>
  );
}

function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState([]);
  const page = useApi(`/admin/audit?limit=30&offset=${offset}`);

  useEffect(() => {
    if (page.data) setEntries((list) => (offset === 0 ? page.data.items : [...list, ...page.data.items]));
  }, [page.data, offset]);

  return (
    <Card title="Änderungsprotokoll" description="Wer hat wann was geändert. Passwörter und andere sensible Daten werden nie protokolliert.">
      {page.error ? <ErrorBox error={page.error} onRetry={page.reload} /> : (
        <>
          <ul className="activity">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{describeChange(entry)}</strong>
                  {entry.summary && <span className="activity-summary">{entry.summary}</span>}
                </div>
                <span className="activity-side">{formatDateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
          {page.loading && <Spinner />}
          {page.data?.items.length === 30 && (
            <Button variant="ghost" size="small" onClick={() => setOffset((value) => value + 30)}>Ältere laden</Button>
          )}
        </>
      )}
    </Card>
  );
}

export default function Settings() {
  const { data, error, loading, reload } = useApi('/admin/settings');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { contact, social, rating, info, events, legal } = data.settings;

  return (
    <>
      <PageHeader title="Einstellungen" description="Kontaktdaten, Social Media und weitere Angaben, die auf der Webseite erscheinen." />
      <div className="settings-grid">
        <SettingsCard title="Kontaktdaten" settingKey="contact" initial={contact}>
          {({ form, set, errors }) => (
            <>
              <TextField label="Adresse" required value={form.address} onChange={set('address')} error={errors.address} maxLength={200} />
              <div className="field-row">
                <TextField label="Telefon" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Erscheint im Standort-Bereich und im Impressum." />
                <TextField label="E-Mail" type="email" value={form.email} onChange={set('email')} error={errors.email} />
              </div>
              <TextField label="Google-Maps-Link (Route)" value={form.mapsUrl} onChange={set('mapsUrl')} error={errors.mapsUrl} />
              <TextField label="Google-Maps-Einbettung (Karte)" value={form.mapsEmbedUrl} onChange={set('mapsEmbedUrl')} error={errors.mapsEmbedUrl} />
            </>
          )}
        </SettingsCard>

        <SettingsCard title="Social Media" description="Leere Felder werden nicht angezeigt. Links erscheinen in der Fußzeile." settingKey="social" initial={social}>
          {({ form, set, errors }) => (
            <>
              <TextField label="Instagram" placeholder="https://instagram.com/…" value={form.instagram} onChange={set('instagram')} error={errors.instagram} />
              <TextField label="Facebook" placeholder="https://facebook.com/…" value={form.facebook} onChange={set('facebook')} error={errors.facebook} />
              <TextField label="TikTok" placeholder="https://tiktok.com/@…" value={form.tiktok} onChange={set('tiktok')} error={errors.tiktok} />
              <TextField label="WhatsApp" placeholder="https://wa.me/49…" value={form.whatsapp} onChange={set('whatsapp')} error={errors.whatsapp} />
              <TextField label="Google-Profil" placeholder="https://g.page/…" value={form.google} onChange={set('google')} error={errors.google} />
            </>
          )}
        </SettingsCard>

        <SettingsCard
          title="Google-Bewertung"
          description="Die Zahlen im Kopfbereich und im Standort-Bereich."
          settingKey="rating"
          initial={{ value: String(rating.value).replace('.', ','), count: String(rating.count) }}
          toBody={(form) => ({ value: Number(String(form.value).replace(',', '.')), count: Number(form.count) })}
        >
          {({ form, set, errors }) => (
            <div className="field-row">
              <TextField label="Sterne (0–5)" inputMode="decimal" value={form.value} onChange={set('value')} error={errors.value} />
              <TextField label="Anzahl Bewertungen" inputMode="numeric" value={form.count} onChange={set('count')} error={errors.count} />
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          title="Infos für den Chat-Assistenten"
          description="Antworten auf „Kann ich mit Karte zahlen?“, „Liefert ihr?“ und „Gibt es Parkplätze?“. Leer = der Assistent sagt, dass er es nicht weiß."
          settingKey="info"
          initial={{ ...info, paymentMethods: info.paymentMethods.join(', ') }}
          toBody={(form) => ({ ...form, paymentMethods: form.paymentMethods.split(',').map((s) => s.trim()).filter(Boolean) })}
        >
          {({ form, set, errors }) => (
            <>
              <TextField label="Zahlungsarten" hint="Kommagetrennt, z. B. Bargeld, EC-Karte, Apple Pay" value={form.paymentMethods} onChange={set('paymentMethods')} error={errors.paymentMethods} />
              <TextField label="Lieferung" multiline rows={2} value={form.deliveryInfo} onChange={set('deliveryInfo')} error={errors.deliveryInfo} maxLength={500} />
              <TextField label="Parken" multiline rows={2} value={form.parkingInfo} onChange={set('parkingInfo')} error={errors.parkingInfo} maxLength={500} />
            </>
          )}
        </SettingsCard>

        <SettingsCard title="Events" settingKey="events" initial={events}>
          {({ form, set }) => (
            <>
              <Toggle label="Vergangene Events automatisch archivieren" hint="Vorbei = nicht mehr unter „Kommende Events“." checked={form.autoArchive} onChange={set('autoArchive')} />
              <Toggle label="Archiv auf der Event-Seite zeigen" hint="Zeigt die letzten vergangenen Events unter „Das war los“." checked={form.showPast} onChange={set('showPast')} disabled={!form.autoArchive} />
            </>
          )}
        </SettingsCard>
        <SettingsCard
          title="Rechtliche Angaben"
          description="Erscheinen im Impressum und in der Datenschutzerklärung. Leere Pflichtfelder werden dort rot markiert."
          settingKey="legal"
          initial={legal}
        >
          {({ form, set, errors }) => (
            <>
              <div className="field-row">
                <TextField label="Betreiber (Name bzw. Firma)" placeholder="z. B. Max Mustermann" value={form.operator} onChange={set('operator')} error={errors.operator} maxLength={120} />
                <TextField label="Rechtsform / Zusatz" placeholder="z. B. e.K., GmbH – leer bei Einzelunternehmen" value={form.legalForm} onChange={set('legalForm')} error={errors.legalForm} maxLength={80} />
              </div>
              <TextField label="Vertreten durch" hint="Nur bei GmbH/UG o. Ä.: Geschäftsführer" value={form.representative} onChange={set('representative')} error={errors.representative} maxLength={120} />
              <div className="field-row">
                <TextField label="USt-IdNr." hint="Nur falls vorhanden (nicht die Steuernummer)" placeholder="DE123456789" value={form.vatId} onChange={set('vatId')} error={errors.vatId} maxLength={30} />
                <TextField label="Registereintrag" hint="Nur falls im Handelsregister" placeholder="Amtsgericht Kempten, HRA 1234" value={form.register} onChange={set('register')} error={errors.register} maxLength={120} />
              </div>
              <TextField label="Verantwortlich für den Inhalt" hint="Name + Anschrift. Leer = Betreiber an der Shop-Adresse." value={form.responsible} onChange={set('responsible')} error={errors.responsible} maxLength={200} />
            </>
          )}
        </SettingsCard>

        <Card title="Datensicherung" description="Eine Datei mit allen Inhalten, Bildern und Benutzerkonten – kostenlos, ohne Zusatzdienst.">
          <p className="muted small">
            {data.lastBackupAt ? `Letzte Sicherung: ${formatRelative(data.lastBackupAt)}.` : 'Noch keine Sicherung heruntergeladen.'} Empfehlung: alle
            1–2 Wochen und vor größeren Änderungen. Die Datei enthält auch die (verschlüsselten) Passwörter – sicher aufbewahren, z. B.
            in einem privaten Cloud-Ordner, nicht weitergeben.
          </p>
          <div className="card-foot">
            <a className="a-btn a-btn-primary a-btn-small" href="/api/admin/backup" download>💾 Backup herunterladen</a>
          </div>
        </Card>
      </div>
      <AuditLog />
    </>
  );
}
