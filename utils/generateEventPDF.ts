import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewEventData } from '@/context/NewEventContext';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Event } from '@/types';
import { translations } from '@/utils/translations';

async function getPDFLanguage(): Promise<'en' | 'ta'> {
  try {
    const saved = await AsyncStorage.getItem('user_language');
    if (saved === 'ta' || saved === 'en') return saved;
  } catch (e) {}
  return 'en';
}

function tPdf(key: string, lang: 'en' | 'ta', params?: Record<string, string | number>): string {
  const item = translations[key];
  let text = item ? item[lang] || item.en || key : key;
  if (params) {
    Object.keys(params).forEach(pKey => {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(params[pKey]));
    });
  }
  return text;
}

function formatDate(dateStr: string, lang: 'en' | 'ta') {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDay(dateStr: string, lang: 'en' | 'ta') {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { weekday: 'long' });
}

function capitalize(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function getCateringBusinessName(explicitUserId?: string): Promise<string> {
  try {
    const uid = explicitUserId || auth.currentUser?.uid;
    if (!uid) return '';
    const profSnap = await getDoc(doc(db, 'profiles', uid));
    if (profSnap.exists()) {
      const data = profSnap.data();
      return (data.catering_name || data.cateringName || data.business_name || data.businessName || data.catering_business_name || '').trim();
    }
  } catch (e) {
    console.error('Error fetching profile catering business name for PDF:', e);
  }
  return '';
}

export async function generateAndShareEventPDF(data: NewEventData, withPrice: boolean = true) {
  const lang = await getPDFLanguage();
  const cateringBusinessName = await getCateringBusinessName();

  const dateReviews = data.eventDates.map(ed => {
    const dm = data.dateMenus.find(d => d.dateId === ed.id);
    const items = dm?.selectedItems || [];
    const guests = dm?.guestCount ?? data.guestCount;
    const mealTimings = (dm?.mealTimings || ed.mealTimings || {}) as Record<string, { from: string; to: string }>;

    const groups: Record<string, typeof items> = {};
    items.forEach(item => {
      const cat = item.mealCategory.toUpperCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    const menuPerPlate = items.reduce((s, i) => s + (i.price || 0), 0);
    const dateTotal = menuPerPlate * guests;
    return { ed, items, guests, groups, menuPerPlate, dateTotal, mealTimings };
  });

  const grandTotal = dateReviews.reduce((s, dr) => s + dr.dateTotal, 0);
  const totalGuests = dateReviews.reduce((s, dr) => s + dr.guests, 0);

  const dateSections = dateReviews.map(dr => {
    const mealRows = Object.entries(dr.groups).map(([cat, items]) => {
      const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
      const timing = dr.mealTimings[cat.toLowerCase()];
      const timingStr = timing?.from && timing?.to
        ? `<span class="timing">${timing.from} – ${timing.to}</span>`
        : '';

      const itemRows = items.map(item => `
        <tr>
          <td class="item-name">${item.name}</td>
          ${withPrice ? `<td class="item-price">₹${item.price || 0}</td>` : ''}
        </tr>
      `).join('');

      const catLabel = tPdf(capitalize(cat.toLowerCase()), lang);

      return `
        <div class="meal-section">
          <div class="meal-header">
            <span class="meal-title">${catLabel}</span>
            ${timingStr}
            <span class="meal-count">${items.length} ${tPdf('ITEMS', lang)}</span>
          </div>
          <table class="items-table">
            <tbody>${itemRows}</tbody>
          </table>
          ${withPrice ? `
          <div class="subtotal-row">
            <span>${catLabel} ${tPdf('Subtotal', lang)}</span>
            <span>₹${subtotal}</span>
          </div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="date-card">
        <div class="date-card-header">
          <div class="date-info">
            <span class="date-day">${formatDay(dr.ed.date, lang)}</span>
            <span class="date-full">${formatDate(dr.ed.date, lang)}</span>
          </div>
          <div class="date-guests">${dr.guests} ${tPdf('Guests', lang)}</div>
        </div>
        ${mealRows.length > 0 ? mealRows : `<div class="no-menu">${tPdf('No menu selected for this date', lang)}</div>`}
        ${withPrice ? `
        <div class="date-total-row">
          <span>₹${dr.menuPerPlate}/${tPdf('plate', lang)} × ${dr.guests} ${tPdf('guests', lang)}</span>
          <span class="date-total-value">₹${dr.dateTotal.toLocaleString('en-IN')}</span>
        </div>` : ''}
      </div>
    `;
  }).join('');

  const statusKey = data.paymentStatus
    ? capitalize(data.paymentStatus.replace(/_/g, ' '))
    : 'Not Received';
  const paymentStatusLabel = tPdf(statusKey, lang);

  const advanceNum = parseFloat(data.advanceAmount || '0');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #111827; background: #fff; padding: 24px;
    }
    .header {
      display: flex; justify-content: space-between;
      align-items: flex-start; border-bottom: 3px solid #1B4332;
      padding-bottom: 16px; margin-bottom: 24px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 44px; height: 44px; background: #1B4332;
      border-radius: 10px; display: flex; align-items: center;
      justify-content: center; color: #fff; font-size: 22px;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #1B4332; }
    .brand-sub {
      font-size: 10px; color: #6B7280;
      letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;
    }
    .doc-info { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 700; color: #111827; }
    .doc-date { font-size: 11px; color: #6B7280; margin-top: 4px; }
    .event-summary {
      background: #1B4332; color: #fff;
      border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;
    }
    .event-name { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    .event-meta {
      display: flex; flex-wrap: wrap; gap: 12px;
      font-size: 12px; color: #A7F3D0;
    }
    .section-title {
      font-size: 13px; font-weight: 700; color: #6B7280;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin: 20px 0 10px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    .info-card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; }
    .info-card-title {
      font-size: 11px; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .info-label { font-size: 12px; color: #6B7280; }
    .info-value { font-size: 12px; font-weight: 600; color: #111827; text-align: right; max-width: 55%; }
    .date-card {
      border: 1px solid #E5E7EB; border-radius: 12px;
      margin-bottom: 16px; overflow: hidden;
    }
    .date-card-header {
      background: #F0FDF4; padding: 12px 16px;
      display: flex; justify-content: space-between;
      align-items: center; border-bottom: 1px solid #D1FAE5;
    }
    .date-info { display: flex; flex-direction: column; gap: 2px; }
    .date-day { font-size: 11px; color: #6B7280; }
    .date-full { font-size: 14px; font-weight: 700; color: #1B4332; }
    .date-guests {
      font-size: 13px; font-weight: 700; color: #1B4332;
      background: #D1FAE5; padding: 4px 10px; border-radius: 20px;
    }
    .meal-section { padding: 12px 16px; border-bottom: 1px solid #F3F4F6; }
    .meal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .meal-title { font-size: 13px; font-weight: 700; color: #111827; }
    .timing {
      font-size: 11px; color: #1B4332; background: #F0FDF4;
      padding: 2px 8px; border-radius: 20px; border: 1px solid #BBF7D0;
    }
    .meal-count { font-size: 11px; color: #9CA3AF; margin-left: auto; }
    .items-table { width: 100%; border-collapse: collapse; }
    .item-name { font-size: 12px; color: #374151; padding: 3px 0; }
    .item-price { font-size: 12px; font-weight: 600; color: #374151; text-align: right; padding: 3px 0; }
    .subtotal-row {
      display: flex; justify-content: space-between;
      margin-top: 8px; padding-top: 6px;
      border-top: 1px dashed #E5E7EB;
      font-size: 12px; font-weight: 700; color: #111827;
    }
    .date-total-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 12px 16px;
      background: #F9FAFB; font-size: 12px; color: #374151;
    }
    .date-total-value { font-size: 15px; font-weight: 800; color: #1B4332; }
    .no-menu { padding: 12px 16px; font-size: 12px; color: #9CA3AF; font-style: italic; }
    .grand-total {
      background: #1B4332; color: #fff; border-radius: 12px;
      padding: 18px 20px; margin-top: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .grand-total-left { display: flex; flex-direction: column; gap: 4px; }
    .grand-total-label { font-size: 12px; color: #A7F3D0; }
    .grand-total-value { font-size: 26px; font-weight: 800; }
    .grand-total-sub { font-size: 11px; color: #6EE7B7; }
    .grand-total-right { text-align: right; }
    .payment-label {
      font-size: 10px; color: #A7F3D0;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .payment-status { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .payment-advance { font-size: 11px; color: #6EE7B7; margin-top: 2px; }
    .footer {
      text-align: center; margin-top: 28px; padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      font-size: 10px; color: #9CA3AF;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <div class="brand-icon">🍽</div>
      <div>
        <div class="brand-name">${cateringBusinessName}</div>
        <div class="brand-sub">${tPdf('Catering Made Simple', lang)}</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${tPdf('Event Booking Summary', lang)}</div>
      <div class="doc-date">
        ${tPdf('Generated:', lang)} ${new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </div>
    </div>
  </div>

  <div class="event-summary">
    <div class="event-name">${data.eventName}</div>
    <div class="event-meta">
      <span>📅 ${data.eventDates.length} ${tPdf('date(s)', lang)}</span>
      <span>👥 ${totalGuests} ${tPdf('total guests', lang)}</span>
      <span>📍 ${data.venue}</span>
      <span>🍽 ${data.menuType === 'non_veg' ? tPdf('Non-Veg', lang) : tPdf('Pure Veg', lang)}</span>
      <span>🎉 ${tPdf(capitalize(data.eventType.replace(/_/g, ' ')), lang)}</span>
    </div>
  </div>

  <div class="section-title">${tPdf('Booking Details', lang)}</div>
  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-title">${tPdf('Customer Details', lang)}</div>
      <div class="info-row">
        <span class="info-label">${tPdf('Name', lang)}</span>
        <span class="info-value">${data.customerName || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Phone', lang)}</span>
        <span class="info-value">${data.customerPhone || '—'}</span>
      </div>
      ${data.customerAddress ? `
        <div class="info-row">
          <span class="info-label">${tPdf('Address', lang)}</span>
          <span class="info-value">${data.customerAddress}</span>
        </div>` : ''}
    </div>
    <div class="info-card">
      <div class="info-card-title">${tPdf('Event Details', lang)}</div>
      <div class="info-row">
        <span class="info-label">${tPdf('Event', lang)}</span>
        <span class="info-value">${data.eventName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Type', lang)}</span>
        <span class="info-value">${tPdf(capitalize(data.eventType.replace(/_/g, ' ')), lang)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Venue', lang)}</span>
        <span class="info-value">${data.venue}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Total Guests', lang)}</span>
        <span class="info-value">${totalGuests}</span>
      </div>
    </div>
  </div>

  <div class="section-title">${tPdf('Menu & Cost Breakdown', lang)}</div>
  ${dateSections}

  <div class="grand-total">
    <div class="grand-total-left">
      <span class="grand-total-label">${tPdf('Total Estimated Cost', lang)}</span>
      <span class="grand-total-value">₹${grandTotal.toLocaleString('en-IN')}</span>
      <span class="grand-total-sub">
        ${data.eventDates.length} ${tPdf('date(s)', lang)} · ${totalGuests} ${tPdf('total guests', lang)}
      </span>
    </div>
    <div class="grand-total-right">
      <div class="payment-label">${tPdf('Payment Status', lang)}</div>
      <div class="payment-status">${paymentStatusLabel}</div>
      ${advanceNum > 0
        ? `<div class="payment-advance">${tPdf('Current Advance', lang)}: ₹${advanceNum.toLocaleString('en-IN')}</div>`
        : ''}
    </div>
  </div>

  <div class="footer">
    ${tPdf('Generated by CaterEase · Catering Made Simple', lang)}<br/>
    ${tPdf('This is a computer-generated document.', lang)}
  </div>

</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${data.eventName} - ${tPdf('Event Booking Summary', lang)}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (err: any) {
    throw new Error(err.message || 'Failed to generate PDF');
  }
}

export async function generateAndShareInvoiceFromEventId(eventId: string, withPrice: boolean = true) {
  const lang = await getPDFLanguage();

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) {
    throw new Error('Event not found');
  }
  const event = { id: eventSnap.id, ...eventSnap.data() } as Event;
  const cateringBusinessName = await getCateringBusinessName(event.user_id);

  // 1. Fetch dates
  const datesSnap = await getDocs(
    query(collection(db, 'event_dates'), where('event_id', '==', eventId))
  );
  const eventDates = datesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);

  // 2. Fetch menu items for each date
  const dateReviews = await Promise.all(
    eventDates.length > 0
      ? eventDates.map(async (ed: any) => {
          const itemsSnap = await getDocs(
            query(
              collection(db, 'event_menu_items'),
              where('event_id', '==', eventId),
              where('event_date_id', '==', ed.id)
            )
          );
          const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
          const guests = ed.guest_count ?? event.guest_count;
          const mealTimings = ed.meal_timings || {};

          const groups: Record<string, typeof items> = {};
          items.forEach((item: any) => {
            const cat = (item.meal_type || 'main').toUpperCase();
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
          });

          const menuPerPlate = items.reduce((s: number, i: any) => s + (i.price_override || 0), 0);
          const dateTotal = menuPerPlate * guests;

          return { ed, items, guests, groups, menuPerPlate, dateTotal, mealTimings };
        })
      : [
          (async () => {
            const itemsSnap = await getDocs(
              query(collection(db, 'event_menu_items'), where('event_id', '==', eventId))
            );
            const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
            const guests = event.guest_count || 0;
            const groups: Record<string, typeof items> = {};
            items.forEach((item: any) => {
              const cat = (item.meal_type || 'main').toUpperCase();
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(item);
            });
            const menuPerPlate = items.reduce((s: number, i: any) => s + (i.price_override || 0), 0);
            const dateTotal = menuPerPlate * guests;
            return {
              ed: { event_date: event.event_date, meal_types: [] },
              items,
              guests,
              groups,
              menuPerPlate,
              dateTotal,
              mealTimings: {},
            };
          })(),
        ]
  );

  const grandTotal = event.total_amount || dateReviews.reduce((s, dr) => s + dr.dateTotal, 0);
  const totalGuests = dateReviews.reduce((s, dr) => s + dr.guests, 0) || event.guest_count;

  // 3. Fetch customer
  let customerName = '';
  let customerPhone = '';
  let customerAddress = '';
  if (event.customer_id) {
    const custSnap = await getDoc(doc(db, 'customers', event.customer_id));
    if (custSnap.exists()) {
      const c = custSnap.data();
      customerName = c.full_name || '';
      customerPhone = c.phone || '';
      customerAddress = c.address || '';
    }
  }

  // 4. Build HTML
  const dateSections = dateReviews.map(dr => {
    const mealRows = Object.entries(dr.groups).map(([cat, items]: [string, any[]]) => {
      const subtotal = items.reduce((s, i) => s + (i.price_override || 0), 0);
      const timing = dr.mealTimings[cat.toLowerCase()];
      const timingStr = timing?.from && timing?.to
        ? `<span class="timing">${timing.from} – ${timing.to}</span>`
        : '';

      const itemRows = items.map((item: any) => `
        <tr>
          <td class="item-name">${item.menu_items?.name || item.name || 'Item'}</td>
          ${withPrice ? `<td class="item-price">₹${item.price_override || 0}</td>` : ''}
        </tr>
      `).join('');

      const catLabel = tPdf(capitalize(cat.toLowerCase()), lang);

      return `
        <div class="meal-section">
          <div class="meal-header">
            <span class="meal-title">${catLabel}</span>
            ${timingStr}
            <span class="meal-count">${items.length} ${tPdf('ITEMS', lang)}</span>
          </div>
          <table class="items-table"><tbody>${itemRows}</tbody></table>
          ${withPrice ? `
          <div class="subtotal-row">
            <span>${catLabel} ${tPdf('Subtotal', lang)}</span>
            <span>₹${subtotal}</span>
          </div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="date-card">
        <div class="date-card-header">
          <div class="date-info">
            <span class="date-day">${dr.ed.event_date ? formatDay(dr.ed.event_date, lang) : ''}</span>
            <span class="date-full">${dr.ed.event_date ? formatDate(dr.ed.event_date, lang) : ''}</span>
          </div>
          <div class="date-guests">${dr.guests} ${tPdf('Guests', lang)}</div>
        </div>
        ${mealRows.length > 0 ? mealRows : `<div class="no-menu">${tPdf('No menu selected for this date', lang)}</div>`}
        ${withPrice ? `
        <div class="date-total-row">
          <span>₹${dr.menuPerPlate}/${tPdf('plate', lang)} × ${dr.guests} ${tPdf('guests', lang)}</span>
          <span class="date-total-value">₹${dr.dateTotal.toLocaleString('en-IN')}</span>
        </div>` : ''}
      </div>
    `;
  }).join('');

  const statusKey = event.payment_status
    ? capitalize(event.payment_status.replace(/_/g, ' '))
    : 'Not Received';
  const paymentStatusLabel = tPdf(statusKey, lang);

  const advanceNum = event.advance_amount || 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #111827; background: #fff; padding: 24px;
    }
    .header {
      display: flex; justify-content: space-between;
      align-items: flex-start; border-bottom: 3px solid #1B4332;
      padding-bottom: 16px; margin-bottom: 24px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 44px; height: 44px; background: #1B4332;
      border-radius: 10px; display: flex; align-items: center;
      justify-content: center; color: #fff; font-size: 22px;
    }
    .brand-name { font-size: 22px; font-weight: 800; color: #1B4332; }
    .brand-sub {
      font-size: 10px; color: #6B7280;
      letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;
    }
    .doc-info { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 700; color: #111827; }
    .doc-date { font-size: 11px; color: #6B7280; margin-top: 4px; }
    .event-summary {
      background: #1B4332; color: #fff;
      border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;
    }
    .event-name { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    .event-meta {
      display: flex; flex-wrap: wrap; gap: 12px;
      font-size: 12px; color: #A7F3D0;
    }
    .section-title {
      font-size: 13px; font-weight: 700; color: #6B7280;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin: 20px 0 10px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    .info-card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; }
    .info-card-title {
      font-size: 11px; font-weight: 700; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .info-label { font-size: 12px; color: #6B7280; }
    .info-value { font-size: 12px; font-weight: 600; color: #111827; text-align: right; max-width: 55%; }
    .date-card {
      border: 1px solid #E5E7EB; border-radius: 12px;
      margin-bottom: 16px; overflow: hidden;
    }
    .date-card-header {
      background: #F0FDF4; padding: 12px 16px;
      display: flex; justify-content: space-between;
      align-items: center; border-bottom: 1px solid #D1FAE5;
    }
    .date-info { display: flex; flex-direction: column; gap: 2px; }
    .date-day { font-size: 11px; color: #6B7280; }
    .date-full { font-size: 14px; font-weight: 700; color: #1B4332; }
    .date-guests {
      font-size: 13px; font-weight: 700; color: #1B4332;
      background: #D1FAE5; padding: 4px 10px; border-radius: 20px;
    }
    .meal-section { padding: 12px 16px; border-bottom: 1px solid #F3F4F6; }
    .meal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .meal-title { font-size: 13px; font-weight: 700; color: #111827; }
    .timing {
      font-size: 11px; color: #1B4332; background: #F0FDF4;
      padding: 2px 8px; border-radius: 20px; border: 1px solid #BBF7D0;
    }
    .meal-count { font-size: 11px; color: #9CA3AF; margin-left: auto; }
    .items-table { width: 100%; border-collapse: collapse; }
    .item-name { font-size: 12px; color: #374151; padding: 3px 0; }
    .item-price { font-size: 12px; font-weight: 600; color: #374151; text-align: right; padding: 3px 0; }
    .subtotal-row {
      display: flex; justify-content: space-between;
      margin-top: 8px; padding-top: 6px;
      border-top: 1px dashed #E5E7EB;
      font-size: 12px; font-weight: 700; color: #111827;
    }
    .date-total-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 12px 16px;
      background: #F9FAFB; font-size: 12px; color: #374151;
    }
    .date-total-value { font-size: 15px; font-weight: 800; color: #1B4332; }
    .no-menu { padding: 12px 16px; font-size: 12px; color: #9CA3AF; font-style: italic; }
    .grand-total {
      background: #1B4332; color: #fff; border-radius: 12px;
      padding: 18px 20px; margin-top: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .grand-total-left { display: flex; flex-direction: column; gap: 4px; }
    .grand-total-label { font-size: 12px; color: #A7F3D0; }
    .grand-total-value { font-size: 26px; font-weight: 800; }
    .grand-total-sub { font-size: 11px; color: #6EE7B7; }
    .grand-total-right { text-align: right; }
    .payment-label {
      font-size: 10px; color: #A7F3D0;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .payment-status { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .payment-advance { font-size: 11px; color: #6EE7B7; margin-top: 2px; }
    .footer {
      text-align: center; margin-top: 28px; padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      font-size: 10px; color: #9CA3AF;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <div class="brand-icon">🍽</div>
      <div>
        <div class="brand-name">${cateringBusinessName}</div>
        <div class="brand-sub">${tPdf('Catering Made Simple', lang)}</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${tPdf('Event Invoice / Booking Summary', lang)}</div>
      <div class="doc-date">
        ${tPdf('Generated:', lang)} ${new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </div>
    </div>
  </div>

  <div class="event-summary">
    <div class="event-name">${event.event_name}</div>
    <div class="event-meta">
      <span>📅 ${eventDates.length || 1} ${tPdf('date(s)', lang)}</span>
      <span>👥 ${totalGuests} ${tPdf('total guests', lang)}</span>
      <span>📍 ${event.venue}</span>
      <span>🍽 ${event.menu_type === 'non_veg' ? tPdf('Non-Veg', lang) : tPdf('Pure Veg', lang)}</span>
      <span>🎉 ${tPdf(capitalize((event.event_type || '').replace(/_/g, ' ')), lang)}</span>
    </div>
  </div>

  <div class="section-title">${tPdf('Booking Details', lang)}</div>
  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-title">${tPdf('Customer Details', lang)}</div>
      <div class="info-row">
        <span class="info-label">${tPdf('Name', lang)}</span>
        <span class="info-value">${customerName || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Phone', lang)}</span>
        <span class="info-value">${customerPhone || '—'}</span>
      </div>
      ${customerAddress ? `
        <div class="info-row">
          <span class="info-label">${tPdf('Address', lang)}</span>
          <span class="info-value">${customerAddress}</span>
        </div>` : ''}
    </div>
    <div class="info-card">
      <div class="info-card-title">${tPdf('Event Details', lang)}</div>
      <div class="info-row">
        <span class="info-label">${tPdf('Event', lang)}</span>
        <span class="info-value">${event.event_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Type', lang)}</span>
        <span class="info-value">${tPdf(capitalize((event.event_type || '').replace(/_/g, ' ')), lang)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Venue', lang)}</span>
        <span class="info-value">${event.venue}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${tPdf('Total Guests', lang)}</span>
        <span class="info-value">${totalGuests}</span>
      </div>
    </div>
  </div>

  <div class="section-title">${tPdf('Menu & Cost Breakdown', lang)}</div>
  ${dateSections}

  <div class="grand-total">
    <div class="grand-total-left">
      <span class="grand-total-label">${tPdf('Total Estimated Cost', lang)}</span>
      <span class="grand-total-value">₹${grandTotal.toLocaleString('en-IN')}</span>
      <span class="grand-total-sub">
        ${eventDates.length || 1} ${tPdf('date(s)', lang)} · ${totalGuests} ${tPdf('total guests', lang)}
      </span>
    </div>
    <div class="grand-total-right">
      <div class="payment-label">${tPdf('Payment Status', lang)}</div>
      <div class="payment-status">${paymentStatusLabel}</div>
      ${advanceNum > 0
        ? `<div class="payment-advance">${tPdf('Current Advance', lang)}: ₹${advanceNum.toLocaleString('en-IN')}</div>`
        : ''}
    </div>
  </div>

  <div class="footer">
    ${tPdf('Generated by CaterEase · Catering Made Simple', lang)}<br/>
    ${tPdf('This is a computer-generated invoice document.', lang)}
  </div>

</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${event.event_name} - Invoice`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (err: any) {
    throw new Error(err.message || 'Failed to generate invoice PDF');
  }
}