# AI Grading API Architecture: Vision & Semantic Engine (v2)

This API is a high-performance, decoupled grading pipeline written in C++ (using the Crow framework). It combines optical character recognition (OCR) with an NLP Cross-Encoder to evaluate handwritten student answers against official CBSE answer keys.

---

## 🛠️ Compilation & Build Instructions

### Compilation Command

Compile the C++ backend executable `vision_engine` using `clang++` with maximum native architecture optimizations:

```bash
clang++ -O3 -march=native main.cpp -o vision_engine $(pkg-config --cflags opencv5 tesseract) -lopencv_core -lopencv_imgproc -lopencv_imgcodecs $(pkg-config --libs tesseract) -lpthread -lcurl
```

### System Requirements

* **Inference Engine:** `llama-server` running a Q8_0 quantized GGUF model with the `--reranking` flag active on port `8081`.
* **Libraries:** Crow (HTTP API), OpenCV (Matrix parsing), Tesseract (OCR), Leptonica, Libcurl.

---

## ⚡ Pipeline Workflow

1. **Payload Ingestion**
   The frontend captures images of the Question/Answer Key and the Student's Answer, encoding them in Base64. These are sent to the C++ backend via a `POST` request.

2. **Vision Processing (OpenCV + Tesseract)**
   * **Decoding:** The Base64 strings are decoded back into raw binary image data.
   * **Preprocessing:** OpenCV converts the images to grayscale and applies binary OTSU thresholding to isolate handwriting from the background noise.
   * **Extraction:** The Tesseract LSTM engine processes the cleaned matrices and extracts UTF-8 string text.

3. **Semantic Evaluation (Cross-Encoder Forward Pass)**
   * The extracted text strings are passed to a local `llama-server` inference instance via `libcurl`.
   * The server runs the **CBSE-Neural-Evaluator-v2** model in memory.
   * The neural network processes both strings simultaneously and outputs a raw **logit score** representing the semantic similarity and factual accuracy.

4. **Mathematical Normalization**
   Because the neural network outputs raw logits, the C++ engine applies a strict Sigmoid activation function to squash the tensor output into a clean probability distribution between 0.0 and 1.0:

   $$S(x) = \frac{1}{1 + e^{-x}}$$

   This normalized score is multiplied by 100 to generate the final grade percentage.

5. **System Logging & Response Delivery**
   The C++ server prints a real-time, cinematic diagnostic trace to the terminal for monitoring evaluation requests. A final JSON payload is constructed containing the extracted text, raw tensor data, the final grade, and a boolean pass/fail flag (threshold: 75%).

---

## 🚀 API Specifications

**Endpoint:** `POST /api/ocr/grade-dual`
**Headers:** `Content-Type: application/json`

### 1. Request Payload (Frontend -> C++)

The endpoint expects a JSON object containing two Base64 encoded images.

```json
{
  "question_img_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "answer_img_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 2. Response Payload (C++ -> Frontend)

The API responds with HTTP 200 and the following structured data:

```json
{
  "question_text": "State Ohm's Law.",
  "answer_text": "The current through a conductor is proportional to the voltage.",
  "raw_logit_score": 3.824,
  "grade_percentage": 97,
  "passed": true
}
```

#### 3. Health Check Endpoint

`GET http://localhost:8080/health` -> Returns `200 OK` JSON `{ "status": "OK", "message": "Vision Engine Online" }`.

---

## 💻 Web UI Integration

The React.js + Vite broadsheet frontend is located in the `./web` directory.
Run the development server with:

```bash
cd web
bun install
bun run dev
```
