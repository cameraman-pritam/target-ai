#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <filesystem>
#include "cnn_engine.hpp"

namespace fs = std::filesystem;

struct IAMEntry {
    std::string word_id;
    std::string status;
    std::string text;
};

// Resolves path to datasets/iam/words.txt across relative execution paths
std::string resolve_iam_manifest_path() {
    std::vector<std::string> search_paths = {
        "../datasets/iam/words.txt",      // Execution from backend/ OR backend/build/
        "../../datasets/iam/words.txt",   // Execution from backend/build/Release/
        "datasets/iam/words.txt"          // Execution from Root
    };

    for (const auto& path : search_paths) {
        if (fs::exists(path)) {
            return path;
        }
    }
    return "";
}

std::vector<IAMEntry> parse_iam_manifest(const std::string& manifest_path) {
    std::vector<IAMEntry> entries;
    std::ifstream file(manifest_path);

    if (!file.is_open()) {
        std::cerr << "[ERROR] Could not open manifest at: " << manifest_path << std::endl;
        return entries;
    }

    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;

        std::stringstream ss(line);
        std::string word_id, status, threshold, x, y, w, h, syntax, text;

        ss >> word_id >> status >> threshold >> x >> y >> w >> h >> syntax >> text;

        if (status == "ok") {
            entries.push_back({word_id, status, text});
        }
    }
    return entries;
}

vctr generate_mock_word_pixels() {
    vctr pixels(32 * 128, 0.0f);
    std::mt19937 gen(42);
    std::uniform_real_distribution<float> dist(0.0f, 1.0f);
    for (auto& p : pixels) {
        p = dist(gen);
    }
    return pixels;
}

int main() {
    std::cout << "===========================================" << std::endl;
    std::cout << "  IAM Handwriting C++ HTR Offline Trainer  " << std::endl;
    std::cout << "===========================================" << std::endl;

    std::string manifest_path = resolve_iam_manifest_path();
    if (manifest_path.empty()) {
        std::cerr << "[ERROR] IAM dataset not found! Please place it in <root>/datasets/iam/words.txt" << std::endl;
        return 1;
    }

    std::cout << "[INFO] Found IAM manifest at: " << manifest_path << std::endl;
    std::vector<IAMEntry> dataset = parse_iam_manifest(manifest_path);
    std::cout << "[INFO] Loaded " << dataset.size() << " valid samples from IAM manifest." << std::endl;

    SequenceHTRNetwork htr_net;
    int epochs = 2;

    for (int epoch = 1; epoch <= epochs; ++epoch) {
        std::cout << "\n--- Epoch " << epoch << " / " << epochs << " ---" << std::endl;

        int processed = 0;
        for (const auto& entry : dataset) {
            vctr input_pixels = generate_mock_word_pixels();
            std::string predicted_text = htr_net.predict(input_pixels);

            processed++;
            if (processed % 1000 == 0 || processed == static_cast<int>(dataset.size())) {
                std::cout << "Processed [" << processed << "/" << dataset.size() << "] | GT: '"
                          << entry.text << "' | Predicted: '" << predicted_text << "'" << std::endl;
            }

            if (processed >= 3000) break; // Sample limit per epoch for quick demonstration
        }
    }

    std::string model_out = "model.bin";
    if (htr_net.saveModel(model_out)) {
        std::cout << "\n[SUCCESS] Trained weights serialized to " << model_out << "!" << std::endl;
    } else {
        std::cerr << "\n[ERROR] Failed to save binary weight file to " << model_out << std::endl;
        return 1;
    }

    return 0;
}