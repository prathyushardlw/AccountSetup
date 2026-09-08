import fitz
import json

doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

print(f"Page size: {page.rect.width} x {page.rect.height}")

# Extract all drawings - look for small squares (checkboxes)
drawings = page.get_drawings()
checkboxes = []

for d in drawings:
    rect = d.get('rect')
    if rect:
        w = round(rect.width)
        h = round(rect.height)
        # Checkboxes are typically small squares 12-22 pixels
        if 12 <= w <= 22 and 12 <= h <= 22 and abs(w - h) <= 3:
            checkboxes.append({
                'x': round(rect.x0),
                'top': round(rect.y0),
                'w': w,
                'h': h
            })

# Remove duplicates
seen = set()
unique = []
for cb in checkboxes:
    key = (cb['x'], cb['top'])
    if key not in seen:
        seen.add(key)
        unique.append(cb)

# Sort by position (top to bottom, left to right)
unique.sort(key=lambda c: (c['top'], c['x']))

print(f"\nFound {len(unique)} checkbox rectangles:\n")

# Extract text blocks to match checkboxes with labels
text_dict = page.get_text("dict")
text_blocks = []
for block in text_dict["blocks"]:
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                text_blocks.append({
                    'text': span['text'].strip(),
                    'x': span['bbox'][0],
                    'y': span['bbox'][1],
                    'x1': span['bbox'][2],
                    'y1': span['bbox'][3]
                })

# Function to find nearest text label to the right of a checkbox
def find_label(cb_x, cb_top, cb_w=17):
    best = None
    best_dist = 999999
    for tb in text_blocks:
        # Text should be to the right of checkbox and roughly same vertical position
        if tb['x'] >= cb_x + cb_w - 5:  # Text starts after checkbox
            # Check vertical alignment (within 10 pixels)
            if abs(tb['y'] - cb_top) < 15:
                dist = tb['x'] - cb_x
                if dist < best_dist and dist < 150:  # Within 150px
                    best_dist = dist
                    best = tb['text']
    return best if best else ""

# Group checkboxes by vertical position (rows)
rows = {}
for cb in unique:
    row_key = cb['top'] // 25 * 25  # Group within 25px
    if row_key not in rows:
        rows[row_key] = []
    rows[row_key].append(cb)

# Print all checkboxes with their nearest labels
print("const CHECK_FIELDS = [")
for cb in unique:
    label = find_label(cb['x'], cb['top'])
    print(f"  {{ x: {cb['x']}, top: {cb['top']}, label: '{label}' }},")
print("];")

# Also output as JSON for the mapper
output = []
for cb in unique:
    label = find_label(cb['x'], cb['top'])
    output.append({
        'x': cb['x'],
        'top': cb['top'],
        'label': label
    })

with open('extracted_checkboxes.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nSaved to extracted_checkboxes.json")
