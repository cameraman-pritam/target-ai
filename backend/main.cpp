#include <crow.h>
#include <opencv2/opencv.hpp>
#include <tesseract/baseapi.h>
#include <leptonica/allheaders.h>
#include <mutex>
#include <vector>
#include <algorithm>
#include <cctype>

// Moved outside main() to guarantee it plays nice with the multithreaded routes
static std::mutex ocr_mutex;

int main() {
    crow::SimpleApp app;

    // 1. Initialize the Tesseract Neural Network Engine
    tesseract::TessBaseAPI *ocr = new tesseract::TessBaseAPI();
    
    // Initialize for English ("eng") using the advanced LSTM neural network mode
    if (ocr->Init(NULL, "eng", tesseract::OEM_LSTM_ONLY)) {
        CROW_LOG_ERROR << "Could not initialize Tesseract. Make sure 'tessdata' is available.";
        return 1;
    }
    
    CROW_LOG_INFO << "Target AI - Vision Engine Booting Up...";

    // Health check endpoint
    CROW_ROUTE(app, "/health")([]() {
        return crow::response(200, "Vision Engine Online.");
    });

    // Main Handwriting Extraction Endpoint
    CROW_ROUTE(app, "/api/ocr/extract").methods(crow::HTTPMethod::POST, crow::HTTPMethod::OPTIONS)
    ([&ocr](const crow::request& req) {
        
        // Handle CORS for the React frontend
        if (req.method == crow::HTTPMethod::OPTIONS) {
            crow::response res(200);
            res.add_header("Access-Control-Allow-Origin", "*");
            res.add_header("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.add_header("Access-Control-Allow-Headers", "Content-Type");
            return res;
        }

        // 1. Read the raw binary image data directly from the HTTP POST body
        std::vector<uchar> data(req.body.begin(), req.body.end());
        
        // 2. Use OpenCV to decode the raw bytes into a pixel matrix
        cv::Mat img = cv::imdecode(data, cv::IMREAD_COLOR);
        if (img.empty()) {
            return crow::response(400, "Invalid image data. Could not decode image.");
        }

        // 3. OpenCV Preprocessing (Crucial for handwriting)
        cv::Mat gray, processed_img;
        cv::cvtColor(img, gray, cv::COLOR_BGR2GRAY); // Convert to grayscale
        
        // Apply Otsu's Thresholding (Turns dark gray pencil into pure black, and slightly grey paper into pure white)
        cv::threshold(gray, processed_img, 0, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

        std::string extracted_text;
        
        // 4. Run the Neural Network Prediction
        {
            std::lock_guard<std::mutex> lock(ocr_mutex);
            
            // Feed the cleaned OpenCV matrix into Tesseract
            ocr->SetImage(processed_img.data, processed_img.cols, processed_img.rows, 
                          processed_img.channels(), processed_img.step);
            
            // Extract the text
            char* outText = ocr->GetUTF8Text();
            if (outText) {
                extracted_text = std::string(outText);
                delete[] outText; // Free the memory allocated by Tesseract
            }
        }

        // 5. Clean up the extracted string safely (prevents crashing on blank images)
        if (!extracted_text.empty()) {
            size_t last_char = extracted_text.find_last_not_of(" \n\r\t");
            if (last_char != std::string::npos) {
                extracted_text.erase(last_char + 1);
            } else {
                extracted_text.clear();
            }
        }

        // 6. Return the JSON to the frontend
        crow::json::wvalue res_data;
        res_data["status"] = "success";
        res_data["text"] = extracted_text;

        crow::response res(200, res_data);
        res.add_header("Access-Control-Allow-Origin", "*");
        return res;
    });

    // ---------------------------------------------------------
    // Text Validation Engine Endpoint
    // ---------------------------------------------------------
    CROW_ROUTE(app, "/api/text/analyze").methods(crow::HTTPMethod::POST, crow::HTTPMethod::OPTIONS)
    ([](const crow::request& req) {
        
        // Handle CORS for React
        if (req.method == crow::HTTPMethod::OPTIONS) {
            crow::response res(200);
            res.add_header("Access-Control-Allow-Origin", "*");
            res.add_header("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.add_header("Access-Control-Allow-Headers", "Content-Type");
            return res;
        }

        // 1. Parse the incoming JSON body
        auto body = crow::json::load(req.body);
        if (!body) {
            return crow::response(400, "Invalid JSON payload.");
        }

        // 2. Extract the data safely
        std::string text = body["text"].s();
        
        // 3. Convert the entire text to lowercase (so "React" matches "react")
        std::string lower_text = text;
        std::transform(lower_text.begin(), lower_text.end(), lower_text.begin(),
                       [](unsigned char c){ return std::tolower(c); });

        std::vector<std::string> found_terms;
        std::vector<std::string> missing_terms;

        // 4. Loop through the required terms and hunt them down
        for (const auto& term_val : body["required_terms"]) {
            std::string term = term_val.s();
            
            // Convert term to lowercase for the search
            std::string lower_term = term;
            std::transform(lower_term.begin(), lower_term.end(), lower_term.begin(),
                           [](unsigned char c){ return std::tolower(c); });

            // Check if the term exists anywhere in the text string
            if (lower_text.find(lower_term) != std::string::npos) {
                found_terms.push_back(term); // Keep original case for the JSON reply
            } else {
                missing_terms.push_back(term);
            }
        }

        // 5. Build the smart JSON response
        crow::json::wvalue res_data;
        res_data["found"] = found_terms;
        res_data["missing"] = missing_terms;
        
        // Give a status code depending on if it passed the check
        if (missing_terms.empty()) {
            res_data["status"] = "PASSED";
            res_data["message"] = "All required terms were found in the text.";
        } else {
            res_data["status"] = "FAILED";
            res_data["message"] = "Missing required terms.";
        }

        crow::response res(200, res_data);
        res.add_header("Access-Control-Allow-Origin", "*");
        return res;
    });

    CROW_LOG_INFO << "Starting Crow C++ REST API on port 8080...";
    app.port(8080).multithreaded().run();

    // Clean up Tesseract memory on server shutdown
    ocr->End();
    delete ocr;
    
    return 0;
}