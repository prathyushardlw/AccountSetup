import fitz
doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

# Get text blocks
text_dict = page.get_text('dict')
text_items = []
for block in text_dict['blocks']:
    if 'lines' in block:
        for line in block['lines']:
            for span in line['spans']:
                if span['text'].strip():
                    text_items.append({'text': span['text'].strip(), 'x': span['bbox'][0], 'y': span['bbox'][1]})

def find_label(cb_x, cb_top):
    best = None
    best_dist = 999
    for t in text_items:
        if t['x'] >= cb_x + 5 and abs(t['y'] - cb_top) < 12:
            dist = t['x'] - cb_x
            if dist < best_dist and dist < 120:
                best_dist = dist
                best = t['text']
    return best or ''

# All Blood Panel checkboxes (11x11)
bp_checks = [
    (381, 1027), (380, 1044), (382, 1066), (382, 1083), (382, 1101), (382, 1119), (382, 1136), (382, 1155), (382, 1172), (382, 1190),
    (534, 1027), (534, 1044), (519, 1066), (519, 1083), (519, 1101), (519, 1119), (519, 1136), (519, 1155), (519, 1172), (519, 1190),
    (691, 1044), (668, 1066), (668, 1083), (668, 1101), (668, 1119), (668, 1136), (668, 1155), (668, 1172), (668, 1190),
    (827, 1031), (827, 1048), (827, 1065), (827, 1080), (827, 1097), (827, 1114), (827, 1131), (827, 1148), (827, 1163), (827, 1180), (827, 1197)
]

print('Blood Panel Checkboxes:')
for x, top in sorted(bp_checks, key=lambda c: (c[1], c[0])):
    label = find_label(x, top)
    print(f'  {{ x: {x}, top: {top}, label: "{label}" }}')
