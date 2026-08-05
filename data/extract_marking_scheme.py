import os
import glob
import json
import re
import pandas as pd

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", 
    "in", "on", "at", "to", "for", "from", "by", "with", "about", "against", 
    "between", "into", "through", "during", "before", "after", "above", 
    "below", "up", "down", "out", "off", "over", "under", "again", "further", 
    "then", "once", "and", "or", "but"
}

def extract_keywords(text):
    if not isinstance(text, str):
        return []
    tokens = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    filtered = [w for w in tokens if w not in STOPWORDS]
    # Return unique keywords preserving order
    return list(dict.fromkeys(filtered))[:10]

def main():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    csv_files = glob.glob(os.path.join(data_dir, "*.csv"))
    
    marking_schemes = []

    for csv_file in csv_files:
        filename = os.path.basename(csv_file)
        try:
            df = pd.read_csv(csv_file, low_memory=False)
            q_col = next((c for c in df.columns if 'question' in c.lower()), None)
            a_col = next((c for c in df.columns if 'answer' in c.lower()), None)

            if q_col and a_col:
                for idx, row in df.iterrows():
                    q_val = str(row[q_col]).strip() if pd.notna(row[q_col]) else ""
                    a_val = str(row[a_col]).strip() if pd.notna(row[a_col]) else ""

                    if len(q_val) > 5 and len(a_val) > 5:
                        keywords = extract_keywords(a_val)
                        marking_schemes.append({
                            "id": f"{filename}_{idx}",
                            "question": q_val,
                            "expected_answer": a_val,
                            "expected_keywords": keywords,
                            "max_marks": 5
                        })
        except Exception as err:
            print(f"Error reading {filename}: {err}")

    output_file = os.path.join(data_dir, "cbse_marking_schemes.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(marking_schemes, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(marking_schemes)} marking scheme entries to {output_file}")

if __name__ == "__main__":
    main()
