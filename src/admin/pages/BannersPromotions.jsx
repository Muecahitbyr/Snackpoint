import { useState } from 'react';
import { formatDateTime, fromLocalInput, toLocalInput } from '../api';
import { DateTimeField } from '../DateTimePicker';
import { Badge, Field, ImageField, PageHeader, SelectField, Tabs, TextField, Toggle } from '../ui';
import ManagedList, { FormActions } from './ManagedList';
import { Icon } from '../icons';

/** live / scheduled / expired / off — what visitors see right now. */
function liveState(item) {
  const now = Date.now();
  if (!item.isActive) return <Badge>Aus</Badge>;
  if (item.startsAt && new Date(item.startsAt).getTime() > now) return <Badge tone="warning">Geplant ab {formatDateTime(item.startsAt)}</Badge>;
  if (item.endsAt && new Date(item.endsAt).getTime() <= now) return <Badge>Abgelaufen</Badge>;
  return <Badge tone="success"><span className="live-dot" aria-hidden="true" />Live{item.endsAt ? ` bis ${formatDateTime(item.endsAt)}` : ''}</Badge>;
}

function Schedule({ form, set, errors }) {
  return (
    <div className="field-row">
      <DateTimeField label="Anzeigen ab" hint="Optional" value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} defaultTime="00:00" placeholder="Sofort" />
      <DateTimeField
        label="Anzeigen bis"
        hint="Optional — danach automatisch aus"
        value={form.endsAt}
        onChange={set('endsAt')}
        error={errors.endsAt}
        min={form.startsAt || undefined}
        defaultTime="23:55"
        placeholder="Unbegrenzt"
      />
    </div>
  );
}

const VARIANTS = [
  { id: 'promo', label: 'Rot (Aktion)' },
  { id: 'info', label: 'Gelb (Info)' },
  { id: 'dark', label: 'Schwarz (Hinweis)' },
];

function BannerForm({ item, errors, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    text: item?.text ?? '', linkUrl: item?.linkUrl ?? '', linkLabel: item?.linkLabel ?? '', variant: item?.variant ?? 'promo',
    isActive: item?.isActive ?? true, startsAt: toLocalInput(item?.startsAt), endsAt: toLocalInput(item?.endsAt),
  });
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) });
      }}
    >
      <TextField label="Text" required placeholder="z. B. Heute Sonderaktion: 2 Energy Drinks für 4 €!" value={form.text} onChange={set('text')} error={errors.text} maxLength={200} />
      <div className="field-row">
        <TextField label="Link" hint="Optional, z. B. /produkte oder https://…" value={form.linkUrl} onChange={set('linkUrl')} error={errors.linkUrl} />
        <TextField label="Link-Text" placeholder="Mehr erfahren" value={form.linkLabel} onChange={set('linkLabel')} error={errors.linkLabel} maxLength={40} />
      </div>
      <SelectField label="Farbe" value={form.variant} onChange={set('variant')}>
        {VARIANTS.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
      </SelectField>
      <Field label="Vorschau">
        <div className={`banner-preview banner-preview-${form.variant}`}>
          {form.text || 'Dein Bannertext'}
          {form.linkUrl && <u> {form.linkLabel || 'Mehr erfahren'} →</u>}
        </div>
      </Field>
      <Schedule form={form} set={set} errors={errors} />
      <Toggle label="Aktiv" hint="Erscheint als Leiste ganz oben auf jeder Seite." checked={form.isActive} onChange={set('isActive')} />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

function PromotionForm({ item, errors, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: item?.title ?? '', description: item?.description ?? '', badge: item?.badge ?? '', priceText: item?.priceText ?? '',
    emoji: item?.emoji ?? '', image: item?.image ?? null, isActive: item?.isActive ?? true,
    startsAt: toLocalInput(item?.startsAt), endsAt: toLocalInput(item?.endsAt),
  });
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const { image, ...rest } = form;
        onSave({ ...rest, imageMediaId: image?.id ?? null, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) });
      }}
    >
      <TextField label="Titel" required placeholder="z. B. Energy-Woche" value={form.title} onChange={set('title')} error={errors.title} maxLength={120} />
      <TextField label="Beschreibung" multiline rows={3} value={form.description} onChange={set('description')} error={errors.description} maxLength={600} />
      <div className="field-row">
        <TextField label="Preis / Angebot" placeholder="z. B. 2 für 4 €" value={form.priceText} onChange={set('priceText')} error={errors.priceText} maxLength={60} />
        <TextField label="Etikett" placeholder="z. B. -20 %" value={form.badge} onChange={set('badge')} error={errors.badge} maxLength={30} />
      </div>
      <div className="field-row">
        <ImageField label="Bild" value={form.image} onChange={set('image')} />
        <TextField label="Emoji (ohne Bild)" value={form.emoji} onChange={set('emoji')} error={errors.emoji} maxLength={16} />
      </div>
      <Schedule form={form} set={set} errors={errors} />
      <Toggle label="Aktiv" hint="Erscheint auf der Startseite im Bereich „Aktionen“." checked={form.isActive} onChange={set('isActive')} />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

export default function BannersPromotions() {
  const [tab, setTab] = useState('banners');

  return (
    <>
      <PageHeader
        title="Banner & Aktionen"
        description="Banner sind Hinweisleisten ganz oben auf der Webseite. Aktionen erscheinen als eigener Bereich auf der Startseite."
      />
      <Tabs active={tab} onChange={setTab} tabs={[
          { id: 'banners', label: 'Banner', icon: 'megaphone' },
          { id: 'promotions', label: 'Aktionen & Angebote', icon: 'tag' },
        ]} />
      {tab === 'banners' ? (
        <ManagedList
          key="banners"
          endpoint="/admin/banners"
          noun="Banner"
          newLabel="Neuer Banner"
          emptyIcon="megaphone"
          emptyText="Noch keine Banner"
          Form={BannerForm}
          describe={(item) => ({ title: item.text, subtitle: item.linkUrl || undefined, badges: liveState(item) })}
        />
      ) : (
        <ManagedList
          key="promotions"
          endpoint="/admin/promotions"
          noun="Aktion"
          newLabel="Neue Aktion"
          emptyIcon="tag"
          emptyText="Noch keine Aktionen"
          Form={PromotionForm}
          describe={(item) => ({
            thumb: item.image ? <img src={item.image.thumbUrl} alt="" /> : item.emoji || <Icon name="tag" />,
            title: item.title,
            subtitle: [item.priceText, item.badge].filter(Boolean).join(' · ') || undefined,
            badges: liveState(item),
          })}
        />
      )}
    </>
  );
}
