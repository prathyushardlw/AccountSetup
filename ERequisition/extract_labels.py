import fitz
doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

# Get all text with positions
blocks = page.get_text('blocks')
text_lines = []
for b in blocks:
    if len(b) >= 5:
        x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4]
        for line in text.strip().split('\n'):
            if line.strip():
                text_lines.append({'text': line.strip(), 'y': y0, 'x': x0})

# X-RAY labels (y 640-960)
print("X-RAY TEXT LABELS:")
print("=" * 80)
xray_text = [t for t in text_lines if 630 <= t['y'] <= 970]
xray_text.sort(key=lambda t: (t['y'], t['x']))
for t in xray_text:
    print(f"  y={int(t['y'])}, x={int(t['x'])}: {t['text']}")

# Blood Panel labels (y 1020-1220)
print("\n\nBLOOD PANEL TEXT LABELS:")
print("=" * 80)
blood_text = [t for t in text_lines if 1010 <= t['y'] <= 1220]
blood_text.sort(key=lambda t: (t['y'], t['x']))
for t in blood_text:
    print(f"  y={int(t['y'])}, x={int(t['x'])}: {t['text']}")
