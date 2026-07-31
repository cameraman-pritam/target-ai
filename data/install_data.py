import os
import pandas as pd
from datasets import load_dataset

target_datasets = [
    "KadamParth/NCERT_Physics_12th",
    "KadamParth/NCERT_Chemistry_12th",
    "KadamParth/NCERT_Biology_12th",
    "KadamParth/NCERT_Mathematics_12th"
]

def download_and_save_ncert_data():
    print("Initiating CBSE/NCERT Class 12 data fetch sequence...\n")
    
    for repo_id in target_datasets:
        subject_name = repo_id.split('_')[1] # Extracts 'Physics', 'Chemistry', etc.
        csv_filename = f"cbse_class12_{subject_name.lower()}_answer_keys.csv"
        
        try:
            print(f"[*] Downloading {subject_name} dataset from {repo_id}...")
            
            # Load the dataset from Hugging Face (defaulting to the 'train' split)
            dataset = load_dataset(repo_id, split='train')
            
            # Convert to a pandas DataFrame for easy CSV export
            df = dataset.to_pandas()
            
            # Save to current working directory
            df.to_csv(csv_filename, index=False)
            
            print(f"[+] Success: Saved to {csv_filename} ({len(df)} rows)")
            
        except Exception as e:
            print(f"[-] Failed to download {repo_id}. Error: {e}")
            
    print("\n[!] All operations complete. Data is ready for the judges.")

if __name__ == "__main__":
    download_and_save_ncert_data()