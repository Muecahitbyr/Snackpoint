import { useEffect, useState } from 'react';
import { api, formatEuroInput, parseEuro, useApi } from '../api';
import { navigate } from '../router';
import {
  Button, Card, ErrorBox, Field, ImageField, PageHeader, SelectField, Spinner, TextField, Toggle, useConfirm, useToast,
} from '../ui';
import { AVAILABILITY } from './Products';
import { Icon } from '../icons';

const EMPTY = {
  name: '', brand: '', categoryId: '', description: '', emoji: '', image: null, price: '', availability: 'available',
  isActive: true, showInCatalog: true, isHighlight: false, highlightBadge: '', allergens: '', additionalInfo: '',
  searchTerms: '', tags: '', inChat: true, chatCategory: '',
};

const toList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

function fromProduct(product) {
  return {
    ...EMPTY,
    ...product,
    image: product.image,
    price: formatEuroInput(product.priceCents),
    searchTerms: product.searchTerms.join(', '),
    tags: product.tags.join(', '),
    chatCategory: product.chatCategory ?? '',
  };
}

/** Mini version of the website's product card, so changes are visible right away. */
function Preview({ form, categoryName }) {
  const price = parseEuro(form.price);
  return (
    <div className="preview-card">
      <div className="preview-media">{form.image ? <img src={form.image.url} alt="" /> : form.emoji ? <span>{form.emoji}</span> : <Icon name="package" size={34} />}</div>
      {form.availability !== 'available' && <div className="preview-sash">{AVAILABILITY[form.availability].label.toUpperCase()}</div>}
      <span className="preview-badge">{categoryName || 'Kategorie'}</span>
      <strong>{form.name || 'Produktname'}</strong>
      <p>{form.description || 'Beschreibung'}</p>
      {Number.isFinite(price) && price !== null && <span className="preview-price">{(price / 100).toFixed(2).replace('.', ',')} €</span>}
    </div>
  );
}

export default function ProductForm({ id }) {
  const product = useApi(id ? `/admin/products/${id}` : null);
  const categories = useApi('/admin/categories');
  const meta = useApi('/admin/meta');
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (product.data?.item) setForm(fromProduct(product.data.item));
  }, [product.data]);

  useEffect(() => {
    // New product: preselect the first category.
    if (!id && !form.categoryId && categories.data?.items.length) {
      setForm((prev) => ({ ...prev, categoryId: categories.data.items[0].id }));
    }
  }, [id, categories.data, form.categoryId]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const categoryList = categories.data?.items ?? [];
  const groups = [...new Map(categoryList.map((c) => [c.groupId, c.groupName])).entries()];
  const categoryName = categoryList.find((c) => c.id === form.categoryId)?.name;

  async function save(e) {
    e.preventDefault();
    const priceCents = parseEuro(form.price);
    if (Number.isNaN(priceCents)) {
      setErrors({ priceCents: 'Bitte als Betrag eingeben, z. B. 1,50' });
      return;
    }
    const body = {
      name: form.name, brand: form.brand, categoryId: form.categoryId, description: form.description, emoji: form.emoji,
      imageMediaId: form.image?.id ?? null, priceCents, availability: form.availability, isActive: form.isActive,
      showInCatalog: form.showInCatalog, isHighlight: form.isHighlight, highlightBadge: form.highlightBadge,
      allergens: form.allergens, additionalInfo: form.additionalInfo, searchTerms: toList(form.searchTerms),
      tags: toList(form.tags), inChat: form.inChat, chatCategory: form.chatCategory || null,
    };
    setBusy(true);
    setErrors({});
    try {
      const result = await api(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PUT' : 'POST', body });
      toast.success(id ? 'Änderungen gespeichert — sie sind sofort auf der Webseite sichtbar.' : 'Produkt angelegt.');
      if (!id) navigate(`produkte/${result.item.id}`);
      else setForm(fromProduct(result.item));
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Produkt löschen?',
      message: `„${form.name}“ wird endgültig gelöscht.`,
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' });
      toast.success('Produkt gelöscht.');
      navigate('produkte');
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (id && product.loading && !product.data) return <Spinner />;
  if (id && product.error) return <ErrorBox error={product.error} onRetry={product.reload} />;

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={id ? form.name || 'Produkt bearbeiten' : 'Neues Produkt'}
        description={<a href="#/produkte" className="back-link"><Icon name="arrowLeft" size={15} /> Zurück zur Übersicht</a>}
        actions={
          <>
            {id && <Button variant="danger-ghost" onClick={remove}>Löschen</Button>}
            <Button type="submit" busy={busy}>Speichern</Button>
          </>
        }
      />

      <div className="form-layout">
        <div className="form-main">
          <Card title="Grunddaten">
            <TextField label="Name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={120} />
            <div className="field-row">
              <SelectField label="Kategorie" required value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
                {groups.map(([groupId, groupName]) => (
                  <optgroup key={groupId} label={groupName}>
                    {categoryList.filter((c) => c.groupId === groupId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </SelectField>
              <TextField label="Marke" hint="Optional, z. B. „Takis“" value={form.brand} onChange={set('brand')} error={errors.brand} maxLength={80} />
            </div>
            <TextField label="Beschreibung" multiline rows={3} value={form.description} onChange={set('description')} error={errors.description} maxLength={1000} />
            <div className="field-row">
              <TextField label="Preis (€)" hint="Leer lassen, wenn kein Preis angezeigt werden soll" inputMode="decimal" placeholder="z. B. 1,50" value={form.price} onChange={set('price')} error={errors.priceCents} />
              <TextField label="Emoji" hint="Wird gezeigt, wenn kein Bild gewählt ist" value={form.emoji} onChange={set('emoji')} error={errors.emoji} maxLength={16} />
            </div>
            <ImageField label="Produktbild" hint="Ersetzt das Emoji auf der Webseite." value={form.image} onChange={set('image')} />
          </Card>

          <Card title="Zusatzinfos" description="Optional — erscheinen klein unter der Beschreibung.">
            <TextField label="Allergene" placeholder="z. B. Gluten, Milch, Nüsse" value={form.allergens} onChange={set('allergens')} error={errors.allergens} maxLength={500} />
            <TextField label="Weitere Informationen" multiline rows={2} value={form.additionalInfo} onChange={set('additionalInfo')} error={errors.additionalInfo} maxLength={1000} />
          </Card>

          <Card title="Chat-Assistent" description="Damit der SnackBot dieses Produkt findet. Kannst du meistens so lassen.">
            <TextField label="Suchbegriffe" hint="Kommagetrennt — andere Wörter, mit denen Kunden danach fragen" value={form.searchTerms} onChange={set('searchTerms')} error={errors.searchTerms} />
            <TextField label="Eigenschaften" hint="Kommagetrennt, z. B. scharf, suess, sauer, salzig, kalt, zuckerfrei, beliebt" value={form.tags} onChange={set('tags')} error={errors.tags} />
            <Toggle label="Im Chat-Assistenten auffindbar" checked={form.inChat} onChange={set('inChat')} />
            <SelectField label="Chat-Bereich" value={form.chatCategory} onChange={set('chatCategory')} hint="„Automatisch“ übernimmt den Bereich der Kategorie.">
              <option value="">Automatisch (aus der Kategorie)</option>
              {(meta.data?.chatCategories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </SelectField>
          </Card>
        </div>

        <div className="form-side">
          <Card title="Sichtbarkeit">
            <Toggle label="Aktiv" hint="Inaktive Produkte sind auf der Webseite unsichtbar." checked={form.isActive} onChange={set('isActive')} />
            <Toggle label="Auf der Produktseite anzeigen" checked={form.showInCatalog} onChange={set('showInCatalog')} />
            <Toggle label="Auf der Startseite hervorheben" hint="Erscheint unter „Frisch im Regal“." checked={form.isHighlight} onChange={set('isHighlight')} />
            {form.isHighlight && (
              <TextField label="Highlight-Etikett" placeholder="z. B. NEU, TREND, BESTSELLER" value={form.highlightBadge} onChange={set('highlightBadge')} error={errors.highlightBadge} maxLength={30} />
            )}
          </Card>
          <Card title="Verfügbarkeit">
            <Field>
              <div className="radio-group">
                {Object.entries(AVAILABILITY).map(([value, { label }]) => (
                  <label key={value} className={`radio ${form.availability === value ? 'is-checked' : ''}`}>
                    <input type="radio" name="availability" value={value} checked={form.availability === value} onChange={() => set('availability')(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
          </Card>
          <Card title="Vorschau">
            <Preview form={form} categoryName={categoryName} />
          </Card>
        </div>
      </div>

      <div className="sticky-actions">
        <Button variant="ghost" onClick={() => navigate('produkte')}>Abbrechen</Button>
        <Button type="submit" busy={busy}>Speichern</Button>
      </div>
    </form>
  );
}
