(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  let pdfTemplateBytes = null;

  // PDF page dimensions: 1364 x 1670 points.
  // Coordinates extracted via pdfplumber. pdfplumber top -> pdf-lib y = PH - top.
  // Text is placed slightly above the underline (8pt offset).
  const PH = 1670;
  const OFFSET = 8;

  // ─── Field positions (x, y in pdf-lib coordinates) ──────────────

  // Client Information
  const FIELDS = {
    clientName:    { x: 174, y: PH - 379 + OFFSET },
    clientAddress: { x: 195, y: PH - 428 + OFFSET },
    clientContact: { x: 970, y: PH - 428 + OFFSET },
    clientEmail:   { x: 128, y: PH - 473 + OFFSET },
    emrName:       { x: 174, y: PH - 629 + OFFSET },
    providerName:  { x: 174, y: PH - 814 + OFFSET },
    npiNumber:     { x: 840, y: PH - 814 + OFFSET },
    pocName:       { x: 116, y: PH - 966 + OFFSET },
    pocEmail:      { x: 116, y: PH - 1006 + OFFSET },
    pocContact:    { x: 840, y: PH - 1006 + OFFSET },
    salesName:     { x: 116, y: PH - 1296 + OFFSET },
    salesEmail:    { x: 116, y: PH - 1336 + OFFSET },
    salesContact:  { x: 840, y: PH - 1337 + OFFSET },
    approvedName:  { x: 116, y: PH - 1486 + OFFSET },
    approvedEmail: { x: 116, y: PH - 1526 + OFFSET },
    approvedContact: { x: 840, y: PH - 1527 + OFFSET },
  };

  // Integration Type checkboxes
  const INTEGRATION_TYPE_CB = {
    'Uni-Directional': { x: 60, y: PH - 1133 + 5 - 11.3 - 8.5 },
    'Bi-Directional':  { x: 269, y: PH - 1133 + 5 - 11.3 - 8.5 },
  };

  // ─── Form Data ──────────────────────────────────────────────────

  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function textVal(id) {
    return (document.getElementById(id)?.value || '').trim();
  }

  function getFormData() {
    return {
      clientName: textVal('clientName'),
      clientAddress: textVal('clientAddress'),
      clientContact: textVal('clientContact'),
      clientEmail: textVal('clientEmail'),
      emrName: textVal('emrName'),
      overallVolume: textVal('overallVolume'),
      patientVolume: textVal('patientVolume'),
      pcrVolume: textVal('pcrVolume'),
      volumeSummary: textVal('volumeSummary'),
      providerName: textVal('providerName'),
      npiNumber: textVal('npiNumber'),
      pocName: textVal('pocName'),
      pocEmail: textVal('pocEmail'),
      pocContact: textVal('pocContact'),
      integrationType: radioVal('integrationType'),
      salesName: textVal('salesName'),
      salesEmail: textVal('salesEmail'),
      salesContact: textVal('salesContact'),
      approvedName: textVal('approvedName'),
      approvedEmail: textVal('approvedEmail'),
      approvedContact: textVal('approvedContact'),
    };
  }

  // ─── PDF Generation ─────────────────────────────────────────────

  async function generateFilledPDF() {
    if (!pdfTemplateBytes) {
      alert('PDF template not loaded. Place the template file in the folder and refresh.');
      return;
    }

    var data = getFormData();
    var pdfDoc = await PDFDocument.load(pdfTemplateBytes);
    var font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    var regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    var pages = pdfDoc.getPages();
    var page = pages[0];
    var blueInk = rgb(0.0, 0.18, 0.65);
    var checkColor = rgb(0.0, 0.18, 0.65);
    var FS = 18;

    function wrapText(text, activeFont, size, maxWidth) {
      if (!text) return [];
      var words = String(text).replace(/\s+/g, ' ').trim().split(' ');
      var lines = [];
      var line = '';

      words.forEach(function (word) {
        var next = line ? line + ' ' + word : word;
        if (activeFont.widthOfTextAtSize(next, size) <= maxWidth) {
          line = next;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      });

      if (line) lines.push(line);
      return lines;
    }

    function drawText(x, y, text, size) {
      if (!text) return;
      page.drawText(String(text), { x: x, y: y, size: size || FS, font: font, color: blueInk });
    }

    function markCheckbox(cbMap, selected) {
      if (!selected || !cbMap[selected]) return;
      var pos = cbMap[selected];
      page.drawText('X', { x: pos.x, y: pos.y, size: 12, font: font, color: checkColor });
    }

    // Fill text fields
    for (var key in FIELDS) {
      if (data[key]) {
        var pos = FIELDS[key];
        drawText(pos.x, pos.y, data[key]);
      }
    }

    // Mark integration type checkbox
    markCheckbox(INTEGRATION_TYPE_CB, data.integrationType);

    if (data.overallVolume || data.patientVolume || data.pcrVolume || data.volumeSummary) {
      addVolumeSummaryPage(pdfDoc, data, font, regularFont, blueInk);
    }

    // ─── Save & Download ───
    var filledBytes = await pdfDoc.save();
    var nameBase = (data.clientName || 'EMR_Integration')
      .replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'EMR_Integration';
    downloadPdf(filledBytes, 'EMR_Integration_' + nameBase + '.pdf');

    function addVolumeSummaryPage(doc, values, boldFont, bodyFont, inkColor) {
      var summaryPage = doc.addPage([1364, 1670]);
      var margin = 90;
      var y = 1510;
      var primary = rgb(0.105, 0.369, 0.18);
      var primaryDark = rgb(0.051, 0.231, 0.102);
      var textColor = rgb(0.102, 0.18, 0.102);
      var border = rgb(0.78, 0.84, 0.78);
      var lightGreen = rgb(0.91, 0.96, 0.92);

      summaryPage.drawText('EMR Integration Request Form', {
        x: margin,
        y: y,
        size: 34,
        font: boldFont,
        color: primaryDark,
      });
      y -= 54;

      summaryPage.drawRectangle({ x: margin, y: y - 42, width: 1184, height: 42, color: primary });
      summaryPage.drawText('Expected Volume Summary', {
        x: margin + 18,
        y: y - 29,
        size: 20,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      y -= 86;

      function drawWrappedCellText(text, x, startY, maxWidth) {
        var lines = wrapText(text || '', boldFont, 24, maxWidth);
        lines.forEach(function (line, index) {
          summaryPage.drawText(line, { x: x, y: startY - (index * 30), size: 24, font: boldFont, color: inkColor });
        });
      }

      var tableX = margin;
      var tableY = y;
      var tableWidth = 1184;
      var labelWidth = 365;
      var valueWidth = tableWidth - labelWidth;
      var headerHeight = 58;
      var rowHeight = 92;
      var summaryHeight = 430;
      var tableHeight = headerHeight + (rowHeight * 3) + summaryHeight;
      var valueX = tableX + labelWidth;

      summaryPage.drawRectangle({ x: tableX, y: tableY - tableHeight, width: tableWidth, height: tableHeight, borderColor: primary, borderWidth: 3 });
      summaryPage.drawRectangle({ x: tableX, y: tableY - headerHeight, width: tableWidth, height: headerHeight, color: lightGreen });
      summaryPage.drawLine({ start: { x: valueX, y: tableY }, end: { x: valueX, y: tableY - tableHeight }, thickness: 1.5, color: border });

      summaryPage.drawText('Detail', { x: tableX + 18, y: tableY - 38, size: 20, font: boldFont, color: textColor });
      summaryPage.drawText('Information', { x: valueX + 18, y: tableY - 38, size: 20, font: boldFont, color: textColor });

      function tableRow(label, value, rowTop, height) {
        summaryPage.drawLine({ start: { x: tableX, y: rowTop }, end: { x: tableX + tableWidth, y: rowTop }, thickness: 1.5, color: border });
        summaryPage.drawText(label, { x: tableX + 18, y: rowTop - 43, size: 20, font: boldFont, color: textColor });
        drawWrappedCellText(value, valueX + 18, rowTop - 43, valueWidth - 36);
      }

      var rowTop = tableY - headerHeight;
      tableRow('Expected Overall Volume', values.overallVolume, rowTop, rowHeight);
      rowTop -= rowHeight;
      tableRow('Expected Patient Volume', values.patientVolume, rowTop, rowHeight);
      rowTop -= rowHeight;
      tableRow('Expected PCR Volume', values.pcrVolume, rowTop, rowHeight);
      rowTop -= rowHeight;
      tableRow('Summary', values.volumeSummary, rowTop, summaryHeight);

      y = tableY - tableHeight - 40;

      summaryPage.drawRectangle({ x: margin, y: 90, width: 1184, height: 70, color: lightGreen });
      summaryPage.drawText('This page was generated from the Integration form volume details.', {
        x: margin + 18,
        y: 116,
        size: 16,
        font: bodyFont,
        color: textColor,
      });
    }
  }

  async function downloadPdf(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isTouchDevice = navigator.maxTouchPoints > 1;

    if ((isIOS || isTouchDevice) && navigator.canShare) {
      var file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return;
        } catch (e) { if (e.name === 'AbortError') return; }
      }
    }

    if (isIOS || isTouchDevice) {
      var reader = new FileReader();
      reader.onload = function () {
        var newTab = window.open('', '_blank');
        if (newTab) {
          newTab.document.write(
            '<html><head><title>' + filename + '</title></head>' +
            '<body style="margin:0"><embed width="100%" height="100%" src="' +
            reader.result + '" type="application/pdf"></body></html>'
          );
          newTab.document.close();
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  // ─── PDF Template Loading ───────────────────────────────────────

  async function autoLoadPDF() {
    var btn = document.getElementById('btnGenerate');
    try {
      var resp = await fetch('EMR INT form.pdf');
      if (!resp.ok) throw new Error('PDF not found');
      pdfTemplateBytes = await resp.arrayBuffer();
      btn.disabled = false;
    } catch (e) {
      console.warn('Auto-load failed:', e.message);
      alert('Could not load the PDF template. Place "EMR INT form.pdf" in the Integration folder and refresh.');
    }
  }

  // ─── Init ───────────────────────────────────────────────────────

  function init() {
    var btn = document.getElementById('btnGenerate');
    btn.disabled = true;

    autoLoadPDF();

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Generating...';
      try {
        await generateFilledPDF();
      } catch (e) {
        console.error(e);
        alert('Error generating PDF: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Filled PDF';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
