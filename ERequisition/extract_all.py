import fitz
doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

# Get all drawings for checkboxes
drawings = page.get_drawings()
checkboxes = []
for d in drawings:
    rect = d.get('rect')
    if rect:
        w = round(rect.width)
        h = round(rect.height)
        # Look for checkboxes (square-ish shapes between 10-22px)
        if 10 <= w <= 22 and 10 <= h <= 22 and abs(w - h) <= 3:
            checkboxes.append({
                'x': round(rect.x0), 
                'top': round(rect.y0),
                'w': w, 'h': h
            })

# Remove duplicates
seen = set()
unique = []
for cb in checkboxes:
    key = (cb['x'], cb['top'])
    if key not in seen:
        seen.add(key)
        unique.append(cb)

# Get text blocks for labeling
text_dict = page.get_text('dict')
text_items = []
for block in text_dict['blocks']:
    if 'lines' in block:
        for line in block['lines']:
            for span in line['spans']:
                if span['text'].strip():
                    text_items.append({
                        'text': span['text'].strip(),
                        'x': span['bbox'][0],
                        'y': span['bbox'][1],
                        'x1': span['bbox'][2]
                    })

def find_label(cb_x, cb_top, direction='right'):
    """Find text label near checkbox"""
    best = None
    best_dist = 999
    for t in text_items:
        # Text should be on same row (within 10px vertically)
        if abs(t['y'] - cb_top) > 12:
            continue
        if direction == 'right':
            # Text to the right of checkbox
            dist = t['x'] - (cb_x + 17)
            if 0 < dist < 150 and dist < best_dist:
                best = t['text']
                best_dist = dist
        else:
            # Text to the left
            dist = cb_x - t['x1']
            if 0 < dist < 50 and dist < best_dist:
                best = t['text']
                best_dist = dist
    return best

# X-RAY SECTION (y: 640-960)
print("=" * 80)
print("X-RAY SECTION (y: 640-960)")
print("=" * 80)
xray_cbs = [c for c in unique if 640 <= c['top'] <= 960]
xray_cbs.sort(key=lambda c: (c['top'], c['x']))

for cb in xray_cbs:
    label = find_label(cb['x'], cb['top'])
    lbl_str = f" -> {label}" if label else ""
    print(f"  {{ id: '', x: {cb['x']}, top: {cb['top']} }},{lbl_str}")

# BLOOD PANEL SECTION (y: 1020-1210)
print("\n" + "=" * 80)
print("BLOOD PANEL SECTION (y: 1020-1210)")
print("=" * 80)
blood_cbs = [c for c in unique if 1020 <= c['top'] <= 1210]
blood_cbs.sort(key=lambda c: (c['top'], c['x']))

for cb in blood_cbs:
    label = find_label(cb['x'], cb['top'])
    lbl_str = f" -> {label}" if label else ""
    print(f"  {{ id: '', x: {cb['x']}, top: {cb['top']} }},{lbl_str}")

# Count by column for Blood Panel
print("\n" + "=" * 80)
print("BLOOD PANEL BY COLUMN")
print("=" * 80)
cols = {}
for cb in blood_cbs:
    col = cb['x'] // 100 * 100
    if col not in cols:
        cols[col] = []
    cols[col].append(cb)

for col in sorted(cols.keys()):
    print(f"\nColumn ~{col} (x around {cols[col][0]['x']}):")
    for cb in sorted(cols[col], key=lambda c: c['top']):
        label = find_label(cb['x'], cb['top'])
        print(f"  x={cb['x']}, top={cb['top']} -> {label or '?'}")
