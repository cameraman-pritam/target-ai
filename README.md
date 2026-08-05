# Target AI / Keyword Sniper 

An automated board exam answer sheet evaluation system designed for CBSE/NCERT Class 11 & 12 subjects. It uses a **hybrid execution model** combining an instant in-browser NLP engine for typed answers and a C++ vision server for handwritten physical answer sheets.

---

## How It Works

Evaluating written answers by hand takes time and often suffers from inconsistent grading. Target AI breaks down the grading process into two main paths:

1. **Client-Side Real-Time NLP (In-Browser)**
   - As students type text, a lightweight 1D-CNN + Multi-Layer Perceptron (128 $\rightarrow$ 64 $\rightarrow$ 32 $\rightarrow$ 1) runs directly in the browser sandbox.
   - Evaluates keyword density, synonym equivalences, and concept matches with **0ms network latency**.

2. **Server-Side Handwritten OCR & HTR (Crow C++)**
   - For scanned or webcam-captured physical answer sheets.
   - Uses OpenCV for image preprocessing (CLAHE illumination correction, Gaussian noise removal, and Sauvola/Otsu binarization).
   - Extracts handwriting using Tesseract 5 LSTM OCR and scores the answer using our C++ neural network backend.

---

## Repository Structure

```
├── backend/
│   ├── main.cpp                # Crow C++ REST API server
│   ├── AnnEngine.hpp / .cpp     # Multi-Layer C++ Neural Network & Synonym Matching
│   ├── HtrVisionPipeline.hpp   # OpenCV image processing & Tesseract 5 OCR pipeline
│   └── train_ann.cpp           # C++ offline model training script
├── web/                        # React.js + Vite broadsheet user interface
│   ├── src/hooks/              # Custom evaluation hooks (useSniperEngine, useTargetEngine)
│   └── src/utils/              # In-browser WASM/JS NLP evaluation engine
├── data/                       # Datasets & offline processing scripts
│   ├── download_datasets.py    # Hugging Face NCERT/CBSE dataset scraper
│   └── extract_marking_scheme.py # PDF/CSV marking scheme JSON parser
└── models/                     # Trained weights & tokenizer metadata
```

---

## Quick Start & Run Commands

### 1. Start the C++ Backend Server
First compile and launch the C++ vision engine:

```bash
# From repository root:
g++ -I/usr/include/opencv5 -std=c++17 backend/main.cpp backend/AnnEngine.cpp \
  -o backend/vision_engine -ltesseract -lopencv_core -lopencv_imgproc -lopencv_imgcodecs -lcurl -lpthread

# Run the server on port 8080:
./backend/vision_engine
```

### 2. Start the Web UI
In a separate terminal, start the React dev server:

```bash
cd web
bun install
bun run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## Dataset Ingestion & Model Training

To download fresh NCERT/CBSE datasets from Hugging Face and train the neural network weights:

```bash
# 1. Download datasets from Hugging Face into data/
python3 data/download_datasets.py

# 2. Extract structured marking schemes into cbse_marking_schemes.json
python3 data/extract_marking_scheme.py

# 3. Compile and run the C++ ANN training script
g++ -std=c++17 backend/train_ann.cpp backend/AnnEngine.cpp -o backend/train_ann
./backend/train_ann
```

The trained weights will be saved to `models/cbse_ann_weights.bin`.

---

## API Reference

### `POST /api/ocr/grade-dual`
Evaluates Question Image + Answer Sheet Image (Base64).

**Request Body:**
```json
{
  "question_img_base64": "data:image/png;base64,...",
  "answer_img_base64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "question_text": "Define Ohm's Law...",
  "answer_text": "Voltage across a conductor is proportional to current...",
  "raw_logit_score": 2.080,
  "relevance_score": 0.8889,
  "grade_percentage": 89,
  "passed": true,
  "matched_keywords": ["voltage", "current", "proportional", "conductor"],
  "missing_keywords": []
}
```

### `POST /api/nlp/evaluate`
Real-time text evaluation against expected keywords.

### `GET /health`
Returns backend health and model status: `{ "status": "OK", "message": "CBSE Evaluation Engine Online" }`.

---

## 🛠️ Requirements

- **Backend**: GCC / g++ (C++17), OpenCV 4/5, Tesseract 5, Crow (header-only), libcurl.
- **Frontend**: Node.js / Bun.
- **Python**: Python 3.8+, `pandas`, `datasets`, `huggingface_hub`.
