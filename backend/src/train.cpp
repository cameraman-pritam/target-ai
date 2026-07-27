#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <filesystem>
#include <algorithm>
#include <random>

#define STB_IMAGE_IMPLEMENTATION
#include "../include/stb_image.h"
#include "../include/cnn_engine.hpp"

namespace fs = std::filesystem;

struct IAMEntry {
    std::string word_id;
    std::string status;
    std::string text;
};

std::string resolve_iam_root() {
    std::vector<std::string> search_roots = {
        "../datasets/iam",
        "../../datasets/iam",
        "datasets/iam"
    };

    for (const auto& root : search_roots) {
        if (fs::exists(root + "/words.txt")) {
            return root;
        }
    }
    return "";
}

std::string get_iam_image_path(const std::string& iam_root, const std::string& word_id) {
    std::stringstream ss(word_id);
    std::string part1, part2;
    std::getline(ss, part1, '-'); 
    std::getline(ss, part2, '-'); 
    
    std::string subfolder2 = part1 + "-" + part2; 
    return iam_root + "/words/" + part1 + "/" + subfolder2 + "/" + word_id + ".png";
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

        if (status == "ok" && text.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") == std::string::npos) {
            entries.push_back({word_id, status, text});
        }
    }
    return entries;
}

vctr load_and_preprocess_image(const std::string& img_path, int target_H = 32, int target_W = 128) {
    vctr output_pixels(target_H * target_W, 0.0f);

    int width, height, channels;
    unsigned char* img = stbi_load(img_path.c_str(), &width, &height, &channels, 1);
    
    if (!img) return output_pixels;

    float scale = std::min(static_cast<float>(target_H) / height, static_cast<float>(target_W) / width);
    int new_H = std::max(1, static_cast<int>(height * scale));
    int new_W = std::max(1, static_cast<int>(width * scale));

    for (int y = 0; y < new_H; ++y) {
        for (int x = 0; x < new_W; ++x) {
            int src_x = static_cast<int>(x / scale);
            int src_y = static_cast<int>(y / scale);
            src_x = std::min(src_x, width - 1);
            src_y = std::min(src_y, height - 1);

            unsigned char raw_pixel = img[src_y * width + src_x];
            float norm_pixel = (255.0f - static_cast<float>(raw_pixel)) / 255.0f;
            output_pixels[y * target_W + x] = norm_pixel;
        }
    }

    stbi_image_free(img);
    return output_pixels;
}

int main(int argc, char* argv[]) {
    std::cout << "===========================================" << std::endl;
    std::cout << "   Target AI — C++ HTR Engine Trainer      " << std::endl;
    std::cout << "===========================================" << std::endl;

    int epochs = 30;
    int num_layers = 2; 
    float learning_rate = 0.001f;
    int batch_size = 32;

    if (argc >= 3) {
        epochs = std::stoi(argv[1]);
        num_layers = std::stoi(argv[2]);
        if (argc >= 4) learning_rate = std::stof(argv[3]);
    }

    num_layers = std::clamp(num_layers, 1, 3);

    std::cout << "\n[CONFIG] Epochs: " << epochs 
              << " | Conv Layers: " << num_layers 
              << " | Adam LR: " << learning_rate 
              << " | Batch Size: " << batch_size << std::endl;

    std::string iam_root = resolve_iam_root();
    if (iam_root.empty()) {
        std::cerr << "[ERROR] IAM dataset not found! Check <root>/datasets/iam/" << std::endl;
        return 1;
    }

    std::string manifest_path = iam_root + "/words.txt";
    std::vector<IAMEntry> dataset = parse_iam_manifest(manifest_path);
    std::cout << "[INFO] Loaded " << dataset.size() << " valid alphanumeric samples." << std::endl;

    SequenceHTRNetwork htr_net(num_layers);
    std::mt19937 g(std::random_device{}()); 

    for (int epoch = 1; epoch <= epochs; ++epoch) {
        std::cout << "\n================ Epoch " << epoch << " / " << epochs << " ================" << std::endl;

        std::shuffle(dataset.begin(), dataset.end(), g);

        int processed = 0;
        int current_batch = 0;
        float epoch_accumulated_loss = 0.0f;
        float rolling_batch_loss = 0.0f;
        float display_rolling_loss = 0.0f;

        for (const auto& entry : dataset) {
            std::string img_path = get_iam_image_path(iam_root, entry.word_id);
            if (!fs::exists(img_path)) continue;

            vctr input_pixels = load_and_preprocess_image(img_path, 32, 128);

            // Accumulate Gradients (No Weight Alteration Yet)
            float sample_loss = htr_net.accumulate_gradients(input_pixels, entry.text);
            rolling_batch_loss += sample_loss;
            display_rolling_loss += sample_loss;
            
            processed++;
            current_batch++;

            // Apply Gradients only once Batch Size is reached (Stops Adam Thrashing)
            if (current_batch == batch_size || processed == dataset.size()) {
                htr_net.apply_gradients(learning_rate, current_batch);
                epoch_accumulated_loss += rolling_batch_loss;
                rolling_batch_loss = 0.0f;
                current_batch = 0;
            }

            if (processed % 100 == 0 || processed == dataset.size()) {
                std::string current_prediction = htr_net.predict(input_pixels);
                float avg_loss = display_rolling_loss / (processed % 100 == 0 ? 100.0f : static_cast<float>(processed % 100));

                std::cout << "Step [" << processed << "/" << dataset.size() << "] "
                          << "| Rolling Loss: " << avg_loss 
                          << " | GT: '" << entry.text << "'"
                          << " | Pred: '" << current_prediction << "'" << std::endl;
                
                display_rolling_loss = 0.0f; 
            }
        }

        std::cout << "\n[INFO] Epoch " << epoch << " Complete."
                  << " | Processed: " << processed 
                  << " | Final Avg Loss: " << (epoch_accumulated_loss / std::max(1, processed)) << std::endl;

        learning_rate *= 0.90f;
        std::cout << "[INFO] Learning rate decayed to: " << learning_rate << std::endl;
    }

    std::string model_out = "model.bin";
    if (htr_net.saveModel(model_out)) {
        std::cout << "\n[SUCCESS] Trained parameters saved to '" << model_out << "'!" << std::endl;
    } else {
        std::cerr << "\n[ERROR] Failed to save binary weight parameters." << std::endl;
        return 1;
    }

    return 0;
}