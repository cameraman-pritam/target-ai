#ifndef CNN_ENGINE_HPP
#define CNN_ENGINE_HPP

#include <vector>
#include <string>
#include <iostream>
#include <fstream>
#include <random>
#include <cmath>
#include <algorithm>
#include <stdexcept>

using vctr = std::vector<float>;
using mtrx = std::vector<vctr>;

constexpr float RELU_LEAK = 0.01f;

// ============================================================================
// 1. CONVOLUTIONAL LAYER (Flat 1D Buffer Storage for Cache Efficiency)
// ============================================================================
struct ConvLayer {
    int F; // Output filters
    int C; // Input channels
    int H; // Input height
    int W; // Input width
    int K; // Kernel dimension (K x K)

    int out_H;
    int out_W;

    vctr filters;
    vctr biases;

    ConvLayer(int filter_count, int channels, int height, int width, int kernel_size)
        : F(filter_count), C(channels), H(height), W(width), K(kernel_size) {
        
        out_H = H - K + 1;
        out_W = W - K + 1;

        filters.resize(F * C * K * K);
        biases.resize(F, 0.0f);

        // Kaiming / He Weight Initialization
        std::mt19937 gen(1337);
        float stddev = std::sqrt(2.0f / static_cast<float>(C * K * K));
        std::normal_distribution<float> dist(0.0f, stddev);

        for (auto& weight : filters) {
            weight = dist(gen);
        }
    }

    inline int get_filter_idx(int f, int c, int ky, int kx) const {
        return f * (C * K * K) + c * (K * K) + ky * K + kx;
    }

    inline int get_map_idx(int c, int y, int x, int map_H, int map_W) const {
        return c * (map_H * map_W) + y * map_W + x;
    }

    vctr forward(const vctr& input) const {
        vctr output(F * out_H * out_W, 0.0f);

        for (int f = 0; f < F; ++f) {
            for (int y = 0; y < out_H; ++y) {
                for (int x = 0; x < out_W; ++x) {
                    float sum = biases[f];

                    for (int c = 0; c < C; ++c) {
                        for (int ky = 0; ky < K; ++ky) {
                            for (int kx = 0; kx < K; ++kx) {
                                int in_idx = get_map_idx(c, y + ky, x + kx, H, W);
                                int flt_idx = get_filter_idx(f, c, ky, kx);
                                sum += input[in_idx] * filters[flt_idx];
                            }
                        }
                    }

                    int out_idx = get_map_idx(f, y, x, out_H, out_W);
                    output[out_idx] = sum;
                }
            }
        }
        return output;
    }

    void save(std::ofstream& file) const {
        file.write(reinterpret_cast<const char*>(filters.data()), filters.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(biases.data()), biases.size() * sizeof(float));
    }

    void load(std::ifstream& file) {
        file.read(reinterpret_cast<char*>(filters.data()), filters.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(biases.data()), biases.size() * sizeof(float));
    }
};

// ============================================================================
// 2. LEAKY RELU ACTIVATION
// ============================================================================
struct ReLULayer {
    vctr forward(const vctr& input) const {
        vctr output(input.size());
        for (size_t i = 0; i < input.size(); ++i) {
            output[i] = (input[i] > 0.0f) ? input[i] : (RELU_LEAK * input[i]);
        }
        return output;
    }
};

// ============================================================================
// 3. MAX POOLING LAYER
// ============================================================================
struct MaxPoolLayer {
    int F, H, W, S;
    int out_H, out_W;

    MaxPoolLayer(int channels, int height, int width, int stride = 2)
        : F(channels), H(height), W(width), S(stride) {
        out_H = H / S;
        out_W = W / S;
    }

    vctr forward(const vctr& input) const {
        vctr output(F * out_H * out_W, 0.0f);

        for (int f = 0; f < F; ++f) {
            for (int y = 0; y < out_H; ++y) {
                for (int x = 0; x < out_W; ++x) {
                    float max_val = -1e9f;

                    for (int py = 0; py < S; ++py) {
                        for (int px = 0; px < S; ++px) {
                            int in_y = y * S + py;
                            int in_x = x * S + px;
                            int in_idx = f * (H * W) + in_y * W + in_x;
                            if (input[in_idx] > max_val) {
                                max_val = input[in_idx];
                            }
                        }
                    }

                    int out_idx = f * (out_H * out_W) + y * out_W + x;
                    output[out_idx] = max_val;
                }
            }
        }
        return output;
    }
};

// ============================================================================
// 4. SEQUENCE DENSE PROJECTION LAYER
// ============================================================================
struct SequenceDenseLayer {
    int num_inputs;  // Feature depth per column time-step
    int num_outputs; // Size of character dictionary

    mtrx weights;
    vctr biases;

    SequenceDenseLayer(int inputs, int outputs) : num_inputs(inputs), num_outputs(outputs) {
        weights.resize(num_outputs, vctr(num_inputs));
        biases.resize(num_outputs, 0.0f);

        std::mt19937 gen(42);
        float stddev = std::sqrt(2.0f / static_cast<float>(num_inputs));
        std::normal_distribution<float> dist(0.0f, stddev);

        for (int i = 0; i < num_outputs; ++i) {
            for (int j = 0; j < num_inputs; ++j) {
                weights[i][j] = dist(gen);
            }
        }
    }

    mtrx forward(const mtrx& sequence_input) const {
        size_t time_steps = sequence_input.size();
        mtrx output(time_steps, vctr(num_outputs, 0.0f));

        for (size_t t = 0; t < time_steps; ++t) {
            for (int i = 0; i < num_outputs; ++i) {
                float sum = biases[i];
                for (int j = 0; j < num_inputs; ++j) {
                    sum += weights[i][j] * sequence_input[t][j];
                }
                output[t][i] = sum;
            }
        }
        return output;
    }

    void save(std::ofstream& file) const {
        for (int i = 0; i < num_outputs; ++i) {
            file.write(reinterpret_cast<const char*>(weights[i].data()), num_inputs * sizeof(float));
        }
        file.write(reinterpret_cast<const char*>(biases.data()), biases.size() * sizeof(float));
    }

    void load(std::ifstream& file) {
        for (int i = 0; i < num_outputs; ++i) {
            file.read(reinterpret_cast<char*>(weights[i].data()), num_inputs * sizeof(float));
        }
        file.read(reinterpret_cast<char*>(biases.data()), biases.size() * sizeof(float));
    }
};

// ============================================================================
// 5. CTC GREEDY DECODER
// ============================================================================
class CTCDecoder {
private:
    std::string vocab;
    int blank_index;

public:
    CTCDecoder(const std::string& dictionary, int blank_idx)
        : vocab(dictionary), blank_index(blank_idx) {}

    std::string decode(const mtrx& probabilities) const {
        std::vector<int> raw_predictions;

        for (const auto& step_probs : probabilities) {
            int max_idx = static_cast<int>(
                std::distance(step_probs.begin(),
                              std::max_element(step_probs.begin(), step_probs.end()))
            );
            raw_predictions.push_back(max_idx);
        }

        std::string decoded_text = "";
        int prev_char = -1;

        for (int char_idx : raw_predictions) {
            if (char_idx != prev_char) {
                if (char_idx != blank_index && char_idx < static_cast<int>(vocab.length())) {
                    decoded_text += vocab[char_idx];
                }
                prev_char = char_idx;
            }
        }
        return decoded_text;
    }
};

// ============================================================================
// 6. MASTER SEQUENCE HTR NETWORK
// ============================================================================
class SequenceHTRNetwork {
public:
    ConvLayer conv1;
    ReLULayer relu;
    MaxPoolLayer pool1;
    SequenceDenseLayer dense;
    CTCDecoder decoder;

    // Vocab: 0-61 = A-Z, a-z, 0-9; Index 62 = CTC Blank
    SequenceHTRNetwork()
        : conv1(8, 1, 32, 128, 3), 
          relu(),
          pool1(8, 30, 126, 2),    
          dense(8 * 15, 63),       
          decoder("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ", 62)
    {}

    mtrx forward(const vctr& input_pixels) const {
        if (input_pixels.size() != 32 * 128) {
            throw std::invalid_argument("Input pixel array must contain exactly 4096 elements (32x128).");
        }

        vctr c1 = conv1.forward(input_pixels);
        vctr a1 = relu.forward(c1);
        vctr p1 = pool1.forward(a1);

        int time_steps = pool1.out_W;            // 63 time steps
        int feature_dim = pool1.F * pool1.out_H; // 8 * 15 = 120 features

        mtrx sequence_features(time_steps, vctr(feature_dim));
        for (int x = 0; x < time_steps; ++x) {
            for (int f = 0; f < pool1.F; ++f) {
                for (int y = 0; y < pool1.out_H; ++y) {
                    int tensor_idx = f * (pool1.out_H * pool1.out_W) + y * pool1.out_W + x;
                    int feature_idx = f * pool1.out_H + y;
                    sequence_features[x][feature_idx] = p1[tensor_idx];
                }
            }
        }

        mtrx raw_logits = dense.forward(sequence_features);

        // Compute Softmax per time step
        mtrx probabilities(time_steps, vctr(63, 0.0f));
        for (int t = 0; t < time_steps; ++t) {
            float max_logit = *std::max_element(raw_logits[t].begin(), raw_logits[t].end());
            float sum_exp = 0.0f;
            for (size_t v = 0; v < raw_logits[t].size(); ++v) {
                probabilities[t][v] = std::exp(raw_logits[t][v] - max_logit);
                sum_exp += probabilities[t][v];
            }
            for (size_t v = 0; v < probabilities[t].size(); ++v) {
                probabilities[t][v] /= sum_exp;
            }
        }

        return probabilities;
    }

    std::string predict(const vctr& input_pixels) const {
        mtrx probabilities = forward(input_pixels);
        return decoder.decode(probabilities);
    }

    bool saveModel(const std::string& filepath) const {
        std::ofstream file(filepath, std::ios::binary);
        if (!file.is_open()) return false;

        conv1.save(file);
        dense.save(file);

        file.close();
        return true;
    }

    bool loadModel(const std::string& filepath) {
        std::ifstream file(filepath, std::ios::binary);
        if (!file.is_open()) return false;

        conv1.load(file);
        dense.load(file);

        file.close();
        return true;
    }
};

#endif // CNN_ENGINE_HPP