#include "crow.h"
#include "cnn_engine.hpp"
#include <mutex> // Needed for Multithreading Race Condition Fix

int main() {
    crow::SimpleApp app;

    SequenceHTRNetwork htr_engine;
    std::string model_path = "model.bin";

    if (!htr_engine.loadModel(model_path)) {
        CROW_LOG_WARNING << "Could not load " << model_path << ". Running with initialized weights.";
    } else {
        CROW_LOG_INFO << "Loaded trained model parameters from " << model_path;
    }

    // Engine Mutex guarantees only one thread writes to the internal state variables at a time
    static std::mutex engine_mutex; 

    CROW_ROUTE(app, "/health")([]() {
        return crow::response(200, "OK");
    });

    CROW_ROUTE(app, "/api/ocr/predict").methods(crow::HTTPMethod::POST, crow::HTTPMethod::OPTIONS)([&htr_engine](const crow::request& req) {
        if (req.method == crow::HTTPMethod::OPTIONS) {
            crow::response res(200);
            res.add_header("Access-Control-Allow-Origin", "*");
            res.add_header("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.add_header("Access-Control-Allow-Headers", "Content-Type");
            return res;
        }

        auto body = crow::json::load(req.body);
        if (!body || !body.has("pixels")) {
            crow::response res(400, "Invalid JSON payload: 'pixels' array required.");
            res.add_header("Access-Control-Allow-Origin", "*");
            return res;
        }

        std::vector<float> input_pixels;
        input_pixels.reserve(32 * 128);

        for (const auto& val : body["pixels"]) {
            input_pixels.push_back(static_cast<float>(val.d()));
        }

        if (input_pixels.size() != 32 * 128) {
            crow::response res(400, "Invalid dimensions: Exactly 4096 pixels required.");
            res.add_header("Access-Control-Allow-Origin", "*");
            return res;
        }

        std::string recognized_string;
        {
            // The Thread Lock: Thread B will sit safely at this line until Thread A unlocks
            std::lock_guard<std::mutex> lock(engine_mutex); 
            recognized_string = htr_engine.predict(input_pixels);
        }

        crow::json::wvalue res_data;
        res_data["text"] = recognized_string;
        res_data["status"] = "success";

        crow::response res(200, res_data);
        res.add_header("Access-Control-Allow-Origin", "*");
        return res;
    });

    CROW_LOG_INFO << "Starting Crow C++ REST API on port 8080...";
    app.port(8080).multithreaded().run();
    return 0;
}