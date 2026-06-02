import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

def inspect_notebook(path):
    print(f"\n--- Inspecting {path} ---")
    with open(path, 'r', encoding='utf-8') as f:
        nb = json.load(f)
    cells = nb['cells']
    print(f"Total cells: {len(cells)}")
    for i, cell in enumerate(cells):
        src_preview = "".join(cell.get('source', []))[:100].replace('\n', ' ')
        print(f"Cell {i} ({cell.get('cell_type')}): {src_preview}...")

inspect_notebook(r'C:\Daon_Master_Project\daon\daon-music-studio-v2\acestep-1-5-xl-turbo-4b-kaggle-t4-gpu.ipynb')
inspect_notebook(r'C:\Daon_Master_Project\daon\daon-music-studio-v3\ACE_Step_XL_Ngrok_Kaggle.ipynb')
