import React from "react";

export default function MaterialPdfExport({ project, projectMaterials, allMaterials, excavations, priceItems }) {
  if (!project) return null;

  // Merge project materials with material details
  const materialRows = (projectMaterials || []).map(pm => {
    const mat = (allMaterials || []).find(m => m.id === pm.material_id);
    return {
      name: mat?.name || "–",
      article: mat?.article_number || "–",
      unit: mat?.unit || "–",
      category: mat?.category || "–",
      quantity: pm.quantity || 0,
      notes: pm.notes || "",
    };
  });

  // Group by category
  const grouped = materialRows.reduce((acc, row) => {
    const cat = row.category || "Sonstige";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  const totalRevenue = (excavations || []).reduce((s, e) => s + (e.calculated_price || 0), 0);

  return (
    <div style={{ width: "210mm", padding: "16mm", fontFamily: "Arial, sans-serif", fontSize: "10pt", color: "#1a1a1a", background: "#fff" }}>
      {/* Header */}
      <div style={{ borderBottom: "3px solid #f97316", paddingBottom: "8px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "18pt", fontWeight: "bold", color: "#f97316" }}>Materialübersicht</div>
            <div style={{ fontSize: "12pt", fontWeight: "bold", color: "#1a1a1a", marginTop: "4px" }}>
              {project.project_number} – {project.title}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9pt", color: "#666" }}>
            <div>{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
            <div style={{ marginTop: "2px" }}>SM-Nr: {project.sm_number}</div>
          </div>
        </div>
        <div style={{ marginTop: "6px", fontSize: "9pt", color: "#555" }}>
          {project.client && <span style={{ marginRight: "16px" }}>Kunde: <strong>{project.client}</strong></span>}
          {project.city && <span>Ort: <strong>{project.street ? `${project.street}, ` : ""}{project.city}</strong></span>}
        </div>
      </div>

      {/* Material Tabelle */}
      {materialRows.length === 0 ? (
        <div style={{ color: "#888", fontStyle: "italic", marginTop: "20px" }}>Keine Materialien erfasst.</div>
      ) : (
        Object.entries(grouped).map(([cat, rows]) => (
          <div key={cat} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10pt", fontWeight: "bold", background: "#fff7ed", color: "#c2410c", padding: "4px 8px", borderLeft: "4px solid #f97316", marginBottom: "4px" }}>
              {cat}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Artikel-Nr.</th>
                  <th style={th}>Bezeichnung</th>
                  <th style={{ ...th, textAlign: "center" }}>Menge</th>
                  <th style={{ ...th, textAlign: "center" }}>Einheit</th>
                  <th style={th}>Notizen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={td}>{r.article}</td>
                    <td style={{ ...td, fontWeight: "500" }}>{r.name}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.quantity}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.unit}</td>
                    <td style={{ ...td, color: "#666" }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Footer */}
      <div style={{ marginTop: "24px", borderTop: "1px solid #e5e7eb", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "9pt", color: "#666" }}>
        <div>Gesamtanzahl Positionen: <strong>{materialRows.length}</strong></div>
        {totalRevenue > 0 && (
          <div>Gesamtumsatz Leistungen: <strong>€{totalRevenue.toLocaleString("de-DE")}</strong></div>
        )}
      </div>
    </div>
  );
}

const th = {
  padding: "5px 8px",
  textAlign: "left",
  fontWeight: "bold",
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "4px 8px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};