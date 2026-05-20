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
    var pages = pdfDoc.getPages();
    var page = pages[0];
    var blueInk = rgb(0.0, 0.18, 0.65);
    var checkColor = rgb(0.0, 0.18, 0.65);
    var FS = 11;

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

    // ─── Save & Download ───
    var filledBytes = await pdfDoc.save();
    var nameBase = (data.clientName || 'EMR_Integration')
      .replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'EMR_Integration';
    downloadPdf(filledBytes, 'EMR_Integration_' + nameBase + '.pdf');
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
