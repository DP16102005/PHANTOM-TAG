/**
 * Phantom-Tag DMCA PDF Generator
 *
 * Generates a legally structured DMCA Takedown Notice PDF
 * using pdf-lib (pure JS — no native deps, works in Cloud Functions).
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateDMCAPdf(violation) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  let y = 740;
  const leftMargin = 50;
  const lineHeight = 16;

  function drawText(text, options = {}) {
    const f = options.bold ? fontBold : font;
    const size = options.size || fontSize;
    page.drawText(text, { x: leftMargin, y, font: f, size, color: rgb(0.1, 0.1, 0.1) });
    y -= options.spacing || lineHeight;
  }

  function drawLine() {
    page.drawLine({
      start: { x: leftMargin, y: y + 8 },
      end: { x: 562, y: y + 8 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 10;
  }

  // Header
  drawText('DMCA TAKEDOWN NOTICE', { bold: true, size: 18, spacing: 24 });
  drawText('Digital Millennium Copyright Act (17 U.S.C. § 512)', { size: 9, spacing: 8 });
  drawText('Phantom-Tag Automated Enforcement System', { size: 9, spacing: 20 });
  drawLine();

  // Date
  drawText(`Date: ${new Date().toISOString().split('T')[0]}`, { spacing: 20 });

  // Complainant
  drawText('COMPLAINANT INFORMATION', { bold: true, spacing: 20 });
  drawText(`Organization: ${violation.owner_org || 'Rights Holder'}`, {});
  drawText(`Contact: ${violation.owner_email || 'ip@organization.com'}`, {});
  drawText(`System Reference: Phantom-Tag Asset ID ${violation.matched_asset_id}`, { spacing: 20 });

  // Infringing Content
  drawText('INFRINGING CONTENT', { bold: true, spacing: 20 });
  drawText(`Suspect URL: ${violation.suspect_url || 'N/A'}`, {});
  drawText(`Original Asset: ${violation.matched_asset_title || 'Protected Content'}`, {});
  drawText(`Detection Confidence: ${((violation.confidence || 0) * 100).toFixed(1)}%`, { spacing: 20 });

  // Forensic Evidence
  drawText('CRYPTOGRAPHIC FORENSIC EVIDENCE', { bold: true, spacing: 20 });
  drawText(`Evidence Hash: ${violation.evidence_hash || 'N/A'}`, {});
  drawText(`Watermark Hamming Distance: ${violation.watermark_hamming_distance || 'N/A'} bits`, {});
  drawText(`Leak Source Channel: ${violation.matched_channel_name || 'Unknown'}`, {});
  drawText(`Channel ID: ${violation.matched_channel_id || 'N/A'}`, { spacing: 20 });

  drawLine();

  // Legal statement
  drawText('GOOD FAITH STATEMENT', { bold: true, spacing: 20 });
  const legalText = [
    'I have a good faith belief that the use of the copyrighted material',
    'described above is not authorized by the copyright owner, its agent,',
    'or the law. The information in this notification is accurate, and under',
    'penalty of perjury, I am authorized to act on behalf of the owner of',
    'an exclusive right that is allegedly infringed.',
  ];
  legalText.forEach((line) => drawText(line, { size: 10 }));

  y -= 10;
  drawLine();

  // Footer
  drawText('This notice was generated automatically by the Phantom-Tag', { size: 8, spacing: 12 });
  drawText('Digital Asset Protection System with cryptographic proof of ownership.', { size: 8 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function saveDMCAPdf(violation, outputDir) {
  const pdfBuffer = await generateDMCAPdf(violation);
  const filename = `dmca_${violation.violation_id || Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBuffer);
  return { path: outputPath, filename, buffer: pdfBuffer };
}

module.exports = { generateDMCAPdf, saveDMCAPdf };
