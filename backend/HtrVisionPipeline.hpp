#ifndef HTR_VISION_PIPELINE_HPP
#define HTR_VISION_PIPELINE_HPP

#include <opencv2/opencv.hpp>
#include <tesseract/baseapi.h>
#include <leptonica/allheaders.h>
#include <string>
#include <vector>
#include <mutex>
#include <iostream>

struct HtrExtractionResult {
    std::string text;
    double confidence;
    int word_count;
    bool success;
};

class HtrVisionPipeline {
private:
    tesseract::TessBaseAPI* ocr;
    std::mutex ocr_mutex;

public:
    HtrVisionPipeline() {
        ocr = new tesseract::TessBaseAPI();
        if (ocr->Init(nullptr, "eng", tesseract::OEM_LSTM_ONLY) != 0) {
            std::cerr << "[ocr] Failed to initialize Tesseract engine\n";
        } else {
            ocr->SetPageSegMode(tesseract::PSM_AUTO);
            std::cout << "[ocr] Tesseract 5 initialized\n";
        }
    }

    ~HtrVisionPipeline() {
        if (ocr) {
            ocr->End();
            delete ocr;
        }
    }

    cv::Mat preprocess_image(const cv::Mat& src) {
        if (src.empty()) return src;

        cv::Mat gray, enhanced, blur, binary;
        
        // Convert to grayscale
        if (src.channels() > 1) {
            cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
        } else {
            gray = src.clone();
        }

        // Apply CLAHE for uneven lighting adjustment
        cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(3.0, cv::Size(8, 8));
        clahe->apply(gray, enhanced);

        // Filter paper texture noise
        cv::GaussianBlur(enhanced, blur, cv::Size(3, 3), 0);

        // Binarize text using Otsu thresholding
        cv::threshold(blur, binary, 0, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

        // Close small gaps in strokes
        cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(2, 2));
        cv::morphologyEx(binary, binary, cv::MORPH_CLOSE, kernel);

        return binary;
    }

    HtrExtractionResult process_base64_image(const std::string& b64) {
        HtrExtractionResult res = {"", 0.0, 0, false};
        if (b64.empty()) return res;

        try {
            std::string raw = crow::utility::base64decode(b64);
            std::vector<uchar> bytes(raw.begin(), raw.end());
            cv::Mat img = cv::imdecode(bytes, cv::IMREAD_COLOR);
            if (img.empty()) return res;

            cv::Mat processed = preprocess_image(img);

            std::lock_guard<std::mutex> lock(ocr_mutex);
            ocr->SetImage(processed.data, processed.cols, processed.rows, processed.channels(), processed.step);

            char* text_ptr = ocr->GetUTF8Text();
            int conf = ocr->MeanTextConf();

            std::string text = text_ptr ? std::string(text_ptr) : "";
            delete[] text_ptr;

            if (!text.empty()) {
                size_t last = text.find_last_not_of(" \n\r\t");
                if (last != std::string::npos) text.erase(last + 1);
                else text.clear();
            }

            int words = 0;
            std::stringstream ss(text);
            std::string word;
            while (ss >> word) words++;

            res.text = text;
            res.confidence = static_cast<double>(conf);
            res.word_count = words;
            res.success = !text.empty();
        } catch (const std::exception& e) {
            std::cerr << "[ocr] Error processing image: " << e.what() << "\n";
        }
        return res;
    }
};

#endif // HTR_VISION_PIPELINE_HPP
