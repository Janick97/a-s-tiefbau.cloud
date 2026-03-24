import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function MontageAuftragPdfReport({ montageAuftrag }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      const [leistungen, materialien, beweissicherungen, preisItems] = await Promise.all([
        base44.entities.MontageLeistung.filter({ montage_auftrag_id: montageAuftrag.id }).catch(() => []),
        base44.entities.MontageLeistungMaterial.filter({ montage_auftrag_id: montageAuftrag.id }).catch(() => []),
        base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftrag.id }).catch(() => []),
        base44.entities.MontagePreisItem.list().catch(() => []),
      ]);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 0;

      const checkPage = (needed = 10) => {
        if (y + needed > 275) {
          doc.addPage();
          y = 15;
        }
      };

      // ── Header ──
      doc.setFillColor(51, 65, 85);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Montageauftrag – Abschlussbericht", margin, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, margin, 20);
      doc.text(`SM-Nr.: ${montageAuftrag.sm_number || "-"}`, pageW - margin, 20, { align: "right" });
      y = 36;

      // ── Auftragsdaten ──
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Auftragsdaten", margin + 2, y + 4.5);
      y += 9;

      const info = [
        ["Titel", montageAuftrag.title || "-"],
        ["SM-Nummer", montageAuftrag.sm_number || "-"],
        ["Projektnummer", montageAuftrag.project_number || "-"],
        ["Kunde", montageAuftrag.client || "-"],
        ["Art", montageAuftrag.art || "-"],
        ["Status", montageAuftrag.status || "-"],
        ["Straße / Stadt", [montageAuftrag.street, montageAuftrag.city].filter(Boolean).join(", ") || "-"],
        ["Startdatum", montageAuftrag.start_date ? new Date(montageAuftrag.start_date).toLocaleDateString("de-DE") : "-"],
        ["Zugewiesene Monteure", (montageAuftrag.assigned_monteure || []).map(m => m?.name).filter(Boolean).join(", ") || "-"],
      ];

      doc.setFontSize(9);
      info.forEach(([label, value]) => {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", margin, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(value, contentW - 48);
        doc.text(lines, margin + 48, y);
        y += lines.length * 5 + 1;
      });

      if (montageAuftrag.notes) {
        checkPage(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notizen:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(montageAuftrag.notes, contentW);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 5;
      }
      y += 4;

      // ── Erfasste Leistungen ──
      checkPage(14);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Erfasste Leistungen (${leistungen.length})`, margin + 2, y + 4.5);
      y += 9;

      if (leistungen.length === 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        doc.text("Keine Leistungen erfasst.", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 7;
      } else {
        // Table header
        doc.setFillColor(226, 232, 240);
        doc.rect(margin, y, contentW, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Position / Beschreibung", margin + 1, y + 4.2);
        doc.text("Monteur", margin + 100, y + 4.2);
        doc.text("Menge", margin + 140, y + 4.2);
        doc.text("Datum", margin + 160, y + 4.2);
        y += 7;

        leistungen.forEach((l, i) => {
          const preis = preisItems.find(p => p.id === l.preis_item_id);
          const desc = preis ? `${preis.item_number} – ${preis.description}` : (l.work_description || "-");
          const lines = doc.splitTextToSize(desc, 96);
          const rowH = Math.max(6, lines.length * 4.5 + 2);
          checkPage(rowH + 2);

          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, contentW, rowH, "F");
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(lines, margin + 1, y + 4);
          doc.text(l.monteur_name || "-", margin + 100, y + 4);
          doc.text(String(l.quantity || "-"), margin + 140, y + 4);
          doc.text(l.completion_date ? new Date(l.completion_date).toLocaleDateString("de-DE") : "-", margin + 160, y + 4);

          if (l.notes) {
            const noteLines = doc.splitTextToSize("→ " + l.notes, contentW - 2);
            doc.setTextColor(100, 100, 100);
            doc.text(noteLines, margin + 1, y + rowH - 0.5);
            doc.setTextColor(0, 0, 0);
          }

          y += rowH + 1;
        });
      }
      y += 4;

      // ── Materialverbrauch ──
      checkPage(14);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Materialverbrauch (${materialien.length} Einträge)`, margin + 2, y + 4.5);
      y += 9;

      if (materialien.length === 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        doc.text("Kein Material erfasst.", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 7;
      } else {
        doc.setFillColor(226, 232, 240);
        doc.rect(margin, y, contentW, 6, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Material-ID", margin + 1, y + 4.2);
        doc.text("Menge", margin + 80, y + 4.2);
        doc.text("Verwendet von", margin + 110, y + 4.2);
        doc.text("Datum", margin + 160, y + 4.2);
        y += 7;

        materialien.forEach((m, i) => {
          checkPage(7);
          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, contentW, 6, "F");
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(String(m.material_id || "-"), margin + 1, y + 4);
          doc.text(String(m.quantity_used ?? "-"), margin + 80, y + 4);
          doc.text(m.used_by || "-", margin + 110, y + 4);
          doc.text(m.usage_date ? new Date(m.usage_date).toLocaleDateString("de-DE") : "-", margin + 160, y + 4);
          y += 7;
        });
      }
      y += 4;

      // ── Beweissicherungen ──
      if (beweissicherungen.length > 0) {
        checkPage(14);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 6, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Beweissicherungen (${beweissicherungen.length})`, margin + 2, y + 4.5);
        y += 9;

        beweissicherungen.forEach((b, idx) => {
          checkPage(50);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`Eintrag ${idx + 1}`, margin, y);
          y += 5;

          const bInfo = [
            ["Schädiger", b.schaediger_name || "-"],
            ["Adresse", b.schaediger_adresse || "-"],
            ["Telefon", b.schaediger_nummer || "-"],
            ["Schadensort", [b.schadensort_strasse, b.schadensort_plz, b.schadensort_ort].filter(Boolean).join(", ") || "-"],
            ["Schadensursache", b.schadensursache || "-"],
            ["Uhrzeit Schaden", b.uhrzeit_schaden || "-"],
            ["Uhrzeit Beseitigung", b.uhrzeit_beseitigung || "-"],
            ["Kabeltyp", b.kabel_typ || "-"],
            ["Kabel geschützt", b.kabel_geschuetzt === true ? "Ja" : b.kabel_geschuetzt === false ? "Nein" : "-"],
            ["Kabeltiefe", b.kabel_tiefe_cm ? `${b.kabel_tiefe_cm} cm` : "-"],
            ["Erfasst von", b.erfasst_von || "-"],
            ["Datum", b.erfassungsdatum ? new Date(b.erfassungsdatum).toLocaleDateString("de-DE") : "-"],
            ["Fotos", (b.fotos?.length || 0) + " Foto(s) vorhanden"],
          ];

          doc.setFontSize(8);
          bInfo.forEach(([label, value]) => {
            checkPage(6);
            doc.setFont("helvetica", "bold");
            doc.text(label + ":", margin + 2, y);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(value, contentW - 48);
            doc.text(lines, margin + 48, y);
            y += lines.length * 5;
          });
          y += 4;
        });
      }

      // ── Foto-Übersicht ──
      const allPhotoUrls = leistungen.flatMap(l => l.photos || []);
      if (allPhotoUrls.length > 0) {
        checkPage(10);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 6, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Fotos aus Leistungen (${allPhotoUrls.length} gesamt)`, margin + 2, y + 4.5);
        y += 9;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("Die Fotos sind in der Anwendung unter den jeweiligen Leistungen abrufbar.", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 7;
      }

      // ── Footer auf allen Seiten ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Seite ${i} / ${pageCount}`, pageW - margin, 290, { align: "right" });
        doc.text(`SM-Nr.: ${montageAuftrag.sm_number || "-"} · ${montageAuftrag.title || ""}`, margin, 290);
        doc.setTextColor(0, 0, 0);
      }

      const filename = `Montageauftrag_${montageAuftrag.sm_number || montageAuftrag.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF-Generierung fehlgeschlagen:", err);
      alert("Fehler beim Erstellen des PDFs: " + err.message);
    }
    setIsGenerating(false);
  };

  return (
    <Button
      onClick={generatePdf}
      disabled={isGenerating}
      variant="outline"
      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
    >
      {isGenerating ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />PDF wird erstellt...</>
      ) : (
        <><FileDown className="w-4 h-4 mr-2" />PDF-Bericht</>
      )}
    </Button>
  );
}