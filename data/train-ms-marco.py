import pandas as pd
import random
from sentence_transformers import InputExample
from sentence_transformers.cross_encoder import CrossEncoder
from torch.utils.data import DataLoader
import math
import glob
import os

# 1. Load the local base model from ../model/
print("Loading Local Base Model...")
model_path = '../models/'
# WARNING: ../model/ must contain the raw PyTorch files (config.json, pytorch_model.bin/model.safetensors)
model = CrossEncoder(model_path, num_labels=1)

# 2. Find and Load all CBSE datasets in the current directory (./)
print("Locating CBSE Datasets in current directory...")
csv_files = glob.glob('./cbse_class12_*_answer_keys.csv')

if not csv_files:
    print("Error: No CBSE CSV files found in ./")
    exit(1)

all_qa_pairs = []

for file in csv_files:
    print(f"Loading data from: {file}")
    df = pd.read_csv(file)
    
    # Drop missing values and get questions/answers
    if 'Question' in df.columns and 'Answer' in df.columns:
        pairs = df[['Question', 'Answer']].dropna().values.tolist()
        all_qa_pairs.extend(pairs)
    else:
        print(f"Warning: 'Question' or 'Answer' column missing in {file}. Skipping.")

if not all_qa_pairs:
    print("Error: No valid Question/Answer pairs found.")
    exit(1)

print(f"Total QA pairs loaded across all files: {len(all_qa_pairs)}")

# 3. Create Training Examples (Positive and Negative)
train_examples = []
all_answers = [pair[1] for pair in all_qa_pairs]

for question, correct_answer in all_qa_pairs:
    # Positive Example: The question paired with the right answer (Score = 1.0)
    train_examples.append(InputExample(texts=[question, correct_answer], label=1.0))
    
    # Negative Example: The question paired with a random wrong answer (Score = 0.0)
    wrong_answer = random.choice(all_answers)
    while wrong_answer == correct_answer:
        wrong_answer = random.choice(all_answers)
    train_examples.append(InputExample(texts=[question, wrong_answer], label=0.0))

print(f"Generated {len(train_examples)} training pairs.")

# 4. Prepare the DataLoader
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)

# 5. Train the Model! (Backpropagation)
print("Initiating actual ANN Training Loop...")
model.fit(
    train_dataloader=train_dataloader,
    epochs=4,
    warmup_steps=math.ceil(len(train_dataloader) * 4 * 0.1) # 10% of train data for warm-up
)

# 6. Save the newly trained PyTorch model to disk
output_path = './cbse-custom-reranker-pytorch'
print(f"Saving trained CBSE Reranker to {output_path} ...")
model.save(output_path)
print("Done. Model is ready to be converted to GGUF using llama.cpp's convert script.")