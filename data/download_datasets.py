import os
import json
import pandas as pd
from datasets import load_dataset
from huggingface_hub import HfApi

TARGET_DATASETS = [
    "KadamParth/NCERT_Physics_12th",
    "KadamParth/NCERT_Chemistry_12th",
    "KadamParth/NCERT_Biology_12th",
    "KadamParth/NCERT_Mathematics_12th",
]

def search_ncert_datasets():
    api = HfApi()
    results = list(TARGET_DATASETS)
    try:
        datasets = api.list_datasets(search="NCERT", limit=15)
        for ds in datasets:
            if ds.id not in results and ("NCERT" in ds.id.upper() or "CBSE" in ds.id.upper()):
                results.append(ds.id)
    except Exception as err:
        print(f"Dataset search error: {err}")
    return results

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    datasets = search_ncert_datasets()
    manifest = []

    for repo_id in datasets:
        print(f"Fetching dataset: {repo_id}...")
        try:
            ds = load_dataset(repo_id, split="train")
            df = ds.to_pandas()

            filename = repo_id.replace("/", "_").lower() + ".csv"
            file_path = os.path.join(base_dir, filename)

            df.to_csv(file_path, index=False)
            print(f"Saved {len(df)} rows -> {filename}")

            manifest.append({
                "repo_id": repo_id,
                "rows": len(df),
                "columns": list(df.columns),
                "file": file_path
            })
        except Exception as err:
            print(f"Skipping {repo_id}: {err}")

    manifest_path = os.path.join(base_dir, "downloaded_datasets_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Complete. Manifest saved to {manifest_path}")

if __name__ == "__main__":
    main()
