import React from "react";

export default function MontageLeistungenPdfExport({ project, montageAuftrag, leistungen, materialUsage, priceItems, materials }) {
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Leistungen zusammenfassen nach Position
  const groupedLeistungen = leistungen.reduce((acc, l) => {
    const key = l.preis_item_id;
    if (!acc[key]) {
      const priceItem = priceItems.find(p => p.id === key);
      acc[key] = {
        preis_item_id: key,
        priceItem,
        totalQuantity: 0,
        totalPrice: 0,
        monteure: {},
        locations: new Set(),
      };
    }
    acc[key].totalQuantity += l.quantity || 0;
    acc[key].totalPrice += l.calculated_price || 0;
    if (l.monteur_name) {
      acc[key].monteure[l.monteur_name] = (acc[key].monteure[l.monteur_name] || 0) + (l.quantity || 0);
    }
    if (l.location_name) acc[key].locations.add(l.location_name);
    return acc;
  }, {});

  const groupedLeistungenList = Object.values(groupedLeistungen);

  // Material zusammenfassen
  const groupedMaterials = materialUsage.reduce((acc, u) => {
    const mat = materials.find(m => m.id === u.material_id);
    if (!mat) return acc;
    const key = u.material_id;
    if (!acc[key]) {
      acc[key] = { material: mat, totalQty: 0, monteure: {} };
    }
    acc[key].totalQty += u.quantity_used || 0;
    if (u.used_by) {
      acc[key].monteure[u.used_by] = (acc[key].monteure[u.used_by] || 0) + (u.quantity_used || 0);
    }
    return acc;
  }, {});

  const groupedMaterialsList = Object.values(groupedMaterials);

  // Alle Monteure die Leistungen erbracht haben
  const monteureSet = new Set();
  leistungen.forEach(l => { if (l.monteur_name) monteureSet.add(l.monteur_name); });
  const monteureList = Array.from(monteureSet);

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10pt',
      color: '#1a1a1a',
      background: '#fff',
      padding: '12mm 14mm',
      boxSizing: 'border-box',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '16px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.7, marginBottom: '4px' }}>
            Montagebericht
          </div>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '4px' }}>
            {project?.sm_number || montageAuftrag?.sm_number || '—'}
          </div>
          <div style={{ fontSize: '10pt', opacity: 0.85 }}>
            {project?.title || montageAuftrag?.title || '—'}
          </div>
          {(project?.city || montageAuftrag?.city) && (
            <div style={{ fontSize: '9pt', opacity: 0.7, marginTop: '2px' }}>
              📍 {montageAuftrag?.street || project?.street || ''}{(montageAuftrag?.street || project?.street) ? ', ' : ''}{montageAuftrag?.city || project?.city}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '8pt', opacity: 0.8 }}>
          <div style={{ marginBottom: '2px' }}>Erstellt am</div>
          <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{today}</div>
          {montageAuftrag?.client && (
            <div style={{ marginTop: '8px', fontSize: '9pt' }}>
              <div style={{ opacity: 0.7 }}>Auftraggeber</div>
              <div style={{ fontWeight: 'bold' }}>{montageAuftrag.client}</div>
            </div>
          )}
        </div>
      </div>

      {/* Kennzahlen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '16px',
      }}>
        {[
          { label: 'Positionen', value: groupedLeistungenList.length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Materialarten', value: groupedMaterialsList.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Monteure', value: monteureList.length, color: '#059669', bg: '#ecfdf5' },
        ].map((stat, i) => (

          <div key={i} style={{
            background: stat.bg,
            border: `1px solid ${stat.color}22`,
            borderRadius: '6px',
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '8pt', color: '#6b7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── SECTION 1: Leistungen ── */}
      <SectionHeader color="#2563eb" title="Erbrachte Leistungen" />

      {groupedLeistungenList.length === 0 ? (
        <EmptyRow text="Keine Leistungen erfasst" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th style={th}>Pos.</th>
              <th style={{ ...th, textAlign: 'left' }}>Beschreibung</th>
              <th style={th}>Einheit</th>
              <th style={th}>Menge</th>
              <th style={{ ...th, textAlign: 'left' }}>Monteure</th>
              <th style={th}>Betrag</th>
            </tr>
          </thead>
          <tbody>
            {groupedLeistungenList.map((g, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ ...td, textAlign: 'center', color: '#6b7280', fontSize: '8pt' }}>
                  {g.priceItem?.item_number || '—'}
                </td>
                <td style={{ ...td }}>
                  <div style={{ fontWeight: 500 }}>{g.priceItem?.description || 'Unbekannte Position'}</div>
                  {g.locations.size > 0 && (
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '2px' }}>
                      📍 {Array.from(g.locations).join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'center', color: '#374151' }}>
                  {g.priceItem?.unit || '—'}
                </td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', color: '#1e3a5f' }}>
                  {g.totalQuantity % 1 === 0 ? g.totalQuantity : g.totalQuantity.toFixed(2)}
                </td>
                <td style={{ ...td }}>
                  {Object.entries(g.monteure).map(([name, qty], j) => (
                    <div key={j} style={{ fontSize: '8pt', color: '#374151' }}>
                      <span style={{ fontWeight: 500 }}>{name}</span>
                      <span style={{ color: '#6b7280' }}> ({qty % 1 === 0 ? qty : qty.toFixed(2)} {g.priceItem?.unit || ''})</span>
                    </div>
                  ))}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                  €{g.totalPrice.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <td colSpan={5} style={{ ...td, fontWeight: 'bold', fontSize: '10pt' }}>Gesamtsumme</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 'bold', fontSize: '11pt' }}>
                €{totalRevenue.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* ── SECTION 2: Material ── */}
      <SectionHeader color="#7c3aed" title="Materialverbrauch" />

      {groupedMaterialsList.length === 0 ? (
        <EmptyRow text="Kein Material erfasst" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#4c1d95', color: '#fff' }}>
              <th style={{ ...th, textAlign: 'left' }}>Material</th>
              <th style={th}>Art.-Nr.</th>
              <th style={th}>Einheit</th>
              <th style={th}>Gesamt</th>
              <th style={{ ...th, textAlign: 'left' }}>Verbrauch je Monteur</th>
            </tr>
          </thead>
          <tbody>
            {groupedMaterialsList.map((g, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#faf5ff' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ ...td, fontWeight: 500 }}>{g.material.name}</td>
                <td style={{ ...td, textAlign: 'center', color: '#6b7280', fontSize: '8pt' }}>{g.material.article_number}</td>
                <td style={{ ...td, textAlign: 'center', color: '#374151' }}>{g.material.unit}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', color: '#4c1d95' }}>
                  {g.totalQty % 1 === 0 ? g.totalQty : g.totalQty.toFixed(2)}
                </td>
                <td style={{ ...td }}>
                  {Object.entries(g.monteure).map(([name, qty], j) => (
                    <div key={j} style={{ fontSize: '8pt', color: '#374151' }}>
                      <span style={{ fontWeight: 500 }}>{name}</span>
                      <span style={{ color: '#6b7280' }}> → {qty % 1 === 0 ? qty : qty.toFixed(2)} {g.material.unit}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── SECTION 3: Monteure ── */}
      {monteureList.length > 0 && (
        <>
          <SectionHeader color="#059669" title="Leistungen je Monteur" />
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#065f46', color: '#fff' }}>
                <th style={{ ...th, textAlign: 'left' }}>Monteur</th>
                <th style={th}>Positionen</th>
                <th style={{ ...th, textAlign: 'left' }}>Erbrachte Leistungen</th>
              </tr>
            </thead>
            <tbody>
              {monteureList.map((monteur, i) => {
                const monteursLeistungen = leistungen.filter(l => l.monteur_name === monteur);
                const posCount = new Set(monteursLeistungen.map(l => l.preis_item_id)).size;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#ecfdf5' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ ...td, fontWeight: 'bold', color: '#065f46' }}>{monteur}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#374151' }}>{posCount}</td>
                    <td style={{ ...td }}>
                      {Object.values(
                        monteursLeistungen.reduce((acc, l) => {
                          const pi = priceItems.find(p => p.id === l.preis_item_id);
                          const key = l.preis_item_id;
                          if (!acc[key]) acc[key] = { desc: pi?.description || '—', qty: 0, unit: pi?.unit || '' };
                          acc[key].qty += l.quantity || 0;
                          return acc;
                        }, {})
                      ).map((item, j) => (
                        <div key={j} style={{ fontSize: '8pt', color: '#374151', lineHeight: '1.6' }}>
                          {item.desc}: <strong>{item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)} {item.unit}</strong>
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div style={{
        borderTop: '2px solid #e5e7eb',
        paddingTop: '8px',
        marginTop: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '8pt',
        color: '#9ca3af',
      }}>
        <span>A&S Tief- u. Straßenbau GmbH</span>
        <span>Tiefbau.Cloud – Montagebericht</span>
        <span>{today}</span>
      </div>
    </div>
  );
}

function SectionHeader({ color, title }) {
  return (
    <div style={{
      background: color,
      color: '#fff',
      borderRadius: '4px',
      padding: '6px 12px',
      fontWeight: 'bold',
      fontSize: '10pt',
      marginBottom: '6px',
      letterSpacing: '0.3px',
    }}>
      {title}
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '12px',
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '9pt',
      marginBottom: '16px',
    }}>
      {text}
    </div>
  );
}

const th = {
  padding: '7px 8px',
  fontSize: '8pt',
  fontWeight: 'bold',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const td = {
  padding: '6px 8px',
  fontSize: '9pt',
  verticalAlign: 'top',
};