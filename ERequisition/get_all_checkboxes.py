import pymupdf as fitz
import json

doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

# Get all checkbox rectangles (17x17 and 17x16)
drawings = page.get_drawings()
checkboxes = []
for d in drawings:
    if d['rect']:
        rect = d['rect']
        w = rect[2] - rect[0]
        h = rect[3] - rect[1]
        if 15 <= w <= 18 and 15 <= h <= 18:
            checkboxes.append({
                'x': round(rect[0]),
                'top': round(rect[1]),
                'right': round(rect[2]),
                'bottom': round(rect[3])
            })

# Get all text
text_dict = page.get_text('dict')
all_text = []
for block in text_dict.get('blocks', []):
    if block.get('type') == 0:
        for line in block.get('lines', []):
            line_text = ''
            line_x = 9999
            line_top = 0
            for span in line.get('spans', []):
                line_text += span.get('text', '')
                bbox = span.get('bbox', [])
                if bbox[0] < line_x:
                    line_x = bbox[0]
                line_top = bbox[1]
            if line_text.strip():
                all_text.append({
                    'text': line_text.strip(),
                    'x': round(line_x),
                    'top': round(line_top)
                })

# Match checkboxes to nearest text on the right
results = []
for cb in checkboxes:
    best_match = None
    best_dist = 9999
    for txt in all_text:
        # Text should be to the right of checkbox and on same line (within 15px vertically)
        if txt['x'] > cb['x'] and abs(txt['top'] - cb['top']) < 20:
            dist = txt['x'] - cb['x']
            if dist < best_dist and dist < 200:  # Max 200px distance
                best_dist = dist
                best_match = txt['text']
    
    results.append({
        'x': cb['x'],
        'top': cb['top'],
        'label': best_match or 'UNKNOWN'
    })

results.sort(key=lambda r: (r['top'], r['x']))

print('// All checkboxes found in PDF with their labels:')
print('const ALL_CHECKBOXES = [')
for i, r in enumerate(results):
    label_clean = r['label'].replace("'", "").replace('"', '')[:50]
    print(f"  {{ x: {r['x']}, top: {r['top']}, label: '{label_clean}' }},")
print('];')

# Also output as JSON for the mapper
print('\n// JSON format:')
print(json.dumps(results, indent=2))

doc.close()
