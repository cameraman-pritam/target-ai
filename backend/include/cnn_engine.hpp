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
constexpr float ADAM_BETA1 = 0.9f;
constexpr float ADAM_BETA2 = 0.999f;
constexpr float ADAM_EPSILON = 1e-8f;

// ============================================================================
// 1. CONVOLUTIONAL LAYER
// ============================================================================
struct ConvLayer {
    int F, C, H, W, K;
    int out_H, out_W;
    int t; 

    vctr filters, biases;
    vctr d_filters, d_biases;
    vctr m_filters, v_filters, m_biases, v_biases; 
    vctr last_input;

    ConvLayer(int filter_count, int channels, int height, int width, int kernel_size)
        : F(filter_count), C(channels), H(height), W(width), K(kernel_size), t(0) {
        
        out_H = H - K + 1;
        out_W = W - K + 1;

        int filter_size = F * C * K * K;
        filters.resize(filter_size);
        biases.resize(F, 0.0f);
        d_filters.resize(filter_size, 0.0f);
        d_biases.resize(F, 0.0f);

        m_filters.resize(filter_size, 0.0f);
        v_filters.resize(filter_size, 0.0f);
        m_biases.resize(F, 0.0f);
        v_biases.resize(F, 0.0f);

        std::mt19937 gen(std::random_device{}());
        float stddev = std::sqrt(2.0f / static_cast<float>(C * K * K));
        std::normal_distribution<float> dist(0.0f, stddev);

        for (auto& weight : filters) weight = dist(gen);
    }

    inline int get_filter_idx(int f, int c, int ky, int kx) const {
        return f * (C * K * K) + c * (K * K) + ky * K + kx;
    }

    inline int get_map_idx(int c, int y, int x, int map_H, int map_W) const {
        return c * (map_H * map_W) + y * map_W + x;
    }

    // MEMORY FIX: output passed by reference, completely avoiding Heap Allocation
    void forward(const vctr& input, vctr& output) {
        last_input = input; 
        std::fill(output.begin(), output.end(), 0.0f);

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
    }

    void backward(const vctr& d_out, vctr& d_in) {
        std::fill(d_in.begin(), d_in.end(), 0.0f);

        for (int f = 0; f < F; ++f) {
            for (int y = 0; y < out_H; ++y) {
                for (int x = 0; x < out_W; ++x) {
                    int out_idx = get_map_idx(f, y, x, out_H, out_W);
                    float chain_grad = std::clamp(d_out[out_idx], -5.0f, 5.0f);

                    d_biases[f] += chain_grad;

                    for (int c = 0; c < C; ++c) {
                        for (int ky = 0; ky < K; ++ky) {
                            for (int kx = 0; kx < K; ++kx) {
                                int in_idx = get_map_idx(c, y + ky, x + kx, H, W);
                                int flt_idx = get_filter_idx(f, c, ky, kx);

                                d_filters[flt_idx] += last_input[in_idx] * chain_grad;
                                d_in[in_idx] += filters[flt_idx] * chain_grad;
                            }
                        }
                    }
                }
            }
        }
    }

    void reset_gradients() {
        std::fill(d_filters.begin(), d_filters.end(), 0.0f);
        std::fill(d_biases.begin(), d_biases.end(), 0.0f);
    }

    void update_weights(float lr, int batch_size) {
        t++;
        float beta1_t = std::pow(ADAM_BETA1, t);
        float beta2_t = std::pow(ADAM_BETA2, t);

        for (size_t i = 0; i < filters.size(); ++i) {
            float grad = d_filters[i] / static_cast<float>(batch_size);
            m_filters[i] = ADAM_BETA1 * m_filters[i] + (1.0f - ADAM_BETA1) * grad;
            v_filters[i] = ADAM_BETA2 * v_filters[i] + (1.0f - ADAM_BETA2) * (grad * grad);
            float m_hat = m_filters[i] / (1.0f - beta1_t);
            float v_hat = v_filters[i] / (1.0f - beta2_t);
            filters[i] -= lr * m_hat / (std::sqrt(v_hat) + ADAM_EPSILON);
        }
        for (size_t i = 0; i < biases.size(); ++i) {
            float grad = d_biases[i] / static_cast<float>(batch_size);
            m_biases[i] = ADAM_BETA1 * m_biases[i] + (1.0f - ADAM_BETA1) * grad;
            v_biases[i] = ADAM_BETA2 * v_biases[i] + (1.0f - ADAM_BETA2) * (grad * grad);
            float m_hat = m_biases[i] / (1.0f - beta1_t);
            float v_hat = v_biases[i] / (1.0f - beta2_t);
            biases[i] -= lr * m_hat / (std::sqrt(v_hat) + ADAM_EPSILON);
        }
    }

    void save(std::ofstream& file) const {
        file.write(reinterpret_cast<const char*>(&t), sizeof(int));
        file.write(reinterpret_cast<const char*>(filters.data()), filters.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(biases.data()), biases.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(m_filters.data()), filters.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(v_filters.data()), filters.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(m_biases.data()), biases.size() * sizeof(float));
        file.write(reinterpret_cast<const char*>(v_biases.data()), biases.size() * sizeof(float));
    }

    void load(std::ifstream& file) {
        file.read(reinterpret_cast<char*>(&t), sizeof(int));
        file.read(reinterpret_cast<char*>(filters.data()), filters.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(biases.data()), biases.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(m_filters.data()), filters.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(v_filters.data()), filters.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(m_biases.data()), biases.size() * sizeof(float));
        file.read(reinterpret_cast<char*>(v_biases.data()), biases.size() * sizeof(float));
    }
};

// ============================================================================
// 2. LEAKY RELU ACTIVATION
// ============================================================================
struct ReLULayer {
    vctr last_input;

    void forward(const vctr& input, vctr& output) {
        last_input = input;
        for (size_t i = 0; i < input.size(); ++i) {
            output[i] = (input[i] > 0.0f) ? input[i] : (RELU_LEAK * input[i]);
        }
    }

    void backward(const vctr& d_out, vctr& d_in) {
        for (size_t i = 0; i < d_out.size(); ++i) {
            d_in[i] = d_out[i] * ((last_input[i] > 0.0f) ? 1.0f : RELU_LEAK);
        }
    }
};

// ============================================================================
// 3. MAX POOLING LAYER
// ============================================================================
struct MaxPoolLayer {
    int F, H, W, S;
    int out_H, out_W;
    std::vector<int> max_indices;

    MaxPoolLayer(int channels, int height, int width, int stride = 2)
        : F(channels), H(height), W(width), S(stride) {
        out_H = H / S;
        out_W = W / S;
        max_indices.resize(F * out_H * out_W);
    }

    void forward(const vctr& input, vctr& output) {
        for (int f = 0; f < F; ++f) {
            for (int y = 0; y < out_H; ++y) {
                for (int x = 0; x < out_W; ++x) {
                    float max_val = -1e9f;
                    int max_idx = -1;

                    for (int py = 0; py < S; ++py) {
                        for (int px = 0; px < S; ++px) {
                            int in_y = y * S + py;
                            int in_x = x * S + px;
                            int in_idx = f * (H * W) + in_y * W + in_x;
                            if (input[in_idx] > max_val) {
                                max_val = input[in_idx];
                                max_idx = in_idx;
                            }
                        }
                    }
                    int out_idx = f * (out_H * out_W) + y * out_W + x;
                    output[out_idx] = max_val;
                    max_indices[out_idx] = max_idx;
                }
            }
        }
    }

    void backward(const vctr& d_out, vctr& d_in) {
        std::fill(d_in.begin(), d_in.end(), 0.0f);
        for (size_t i = 0; i < d_out.size(); ++i) {
            int target_idx = max_indices[i];
            if (target_idx >= 0 && target_idx < static_cast<int>(d_in.size())) {
                d_in[target_idx] += d_out[i];
            }
        }
    }
};

// ============================================================================
// 4. SEQUENCE DENSE PROJECTION LAYER
// ============================================================================
struct SequenceDenseLayer {
    int num_inputs, num_outputs, t;
    mtrx weights, last_input;
    vctr biases, d_biases, m_biases, v_biases;
    mtrx d_weights, m_weights, v_weights;

    SequenceDenseLayer(int inputs, int outputs) : num_inputs(inputs), num_outputs(outputs), t(0) {
        weights.resize(num_outputs, vctr(num_inputs));
        biases.resize(num_outputs, 0.0f);
        d_weights.resize(num_outputs, vctr(num_inputs, 0.0f));
        d_biases.resize(num_outputs, 0.0f);
        m_weights.resize(num_outputs, vctr(num_inputs, 0.0f));
        v_weights.resize(num_outputs, vctr(num_inputs, 0.0f));
        m_biases.resize(num_outputs, 0.0f);
        v_biases.resize(num_outputs, 0.0f);

        std::mt19937 gen(std::random_device{}());
        float stddev = std::sqrt(2.0f / static_cast<float>(num_inputs));
        std::normal_distribution<float> dist(0.0f, stddev);

        for (int i = 0; i < num_outputs; ++i) {
            for (int j = 0; j < num_inputs; ++j) weights[i][j] = dist(gen);
        }
    }

    void forward(const mtrx& sequence_input, mtrx& output) {
        last_input = sequence_input;
        size_t time_steps = sequence_input.size();

        for (size_t t_step = 0; t_step < time_steps; ++t_step) {
            for (int i = 0; i < num_outputs; ++i) {
                float sum = biases[i];
                for (int j = 0; j < num_inputs; ++j) {
                    sum += weights[i][j] * sequence_input[t_step][j];
                }
                output[t_step][i] = sum;
            }
        }
    }

    void backward(const mtrx& d_out, mtrx& d_in) {
        size_t time_steps = d_out.size();
        for(size_t t=0; t<time_steps; ++t) {
            std::fill(d_in[t].begin(), d_in[t].end(), 0.0f);
        }

        for (size_t t_step = 0; t_step < time_steps; ++t_step) {
            for (int i = 0; i < num_outputs; ++i) {
                float grad = std::clamp(d_out[t_step][i], -5.0f, 5.0f);
                d_biases[i] += grad;

                for (int j = 0; j < num_inputs; ++j) {
                    d_weights[i][j] += grad * last_input[t_step][j];
                    d_in[t_step][j] += grad * weights[i][j];
                }
            }
        }
    }

    void reset_gradients() {
        for (auto& row : d_weights) std::fill(row.begin(), row.end(), 0.0f);
        std::fill(d_biases.begin(), d_biases.end(), 0.0f);
    }

    void update_weights(float lr, int batch_size) {
        t++;
        float beta1_t = std::pow(ADAM_BETA1, t);
        float beta2_t = std::pow(ADAM_BETA2, t);

        for (int i = 0; i < num_outputs; ++i) {
            for (int j = 0; j < num_inputs; ++j) {
                float grad = d_weights[i][j] / static_cast<float>(batch_size);
                m_weights[i][j] = ADAM_BETA1 * m_weights[i][j] + (1.0f - ADAM_BETA1) * grad;
                v_weights[i][j] = ADAM_BETA2 * v_weights[i][j] + (1.0f - ADAM_BETA2) * (grad * grad);
                float m_hat = m_weights[i][j] / (1.0f - beta1_t);
                float v_hat = v_weights[i][j] / (1.0f - beta2_t);
                weights[i][j] -= lr * m_hat / (std::sqrt(v_hat) + ADAM_EPSILON);
            }
            float grad_b = d_biases[i] / static_cast<float>(batch_size);
            m_biases[i] = ADAM_BETA1 * m_biases[i] + (1.0f - ADAM_BETA1) * grad_b;
            v_biases[i] = ADAM_BETA2 * v_biases[i] + (1.0f - ADAM_BETA2) * (grad_b * grad_b);
            float m_hat_b = m_biases[i] / (1.0f - beta1_t);
            float v_hat_b = v_biases[i] / (1.0f - beta2_t);
            biases[i] -= lr * m_hat_b / (std::sqrt(v_hat_b) + ADAM_EPSILON);
        }
    }

    void save(std::ofstream& file) const {
        file.write(reinterpret_cast<const char*>(&t), sizeof(int));
        for (int i = 0; i < num_outputs; ++i) {
            file.write(reinterpret_cast<const char*>(weights[i].data()), num_inputs * sizeof(float));
            file.write(reinterpret_cast<const char*>(m_weights[i].data()), num_inputs * sizeof(float));
            file.write(reinterpret_cast<const char*>(v_weights[i].data()), num_inputs * sizeof(float));
        }
        file.write(reinterpret_cast<const char*>(biases.data()), num_outputs * sizeof(float));
        file.write(reinterpret_cast<const char*>(m_biases.data()), num_outputs * sizeof(float));
        file.write(reinterpret_cast<const char*>(v_biases.data()), num_outputs * sizeof(float));
    }

    void load(std::ifstream& file) {
        file.read(reinterpret_cast<char*>(&t), sizeof(int));
        for (int i = 0; i < num_outputs; ++i) {
            file.read(reinterpret_cast<char*>(weights[i].data()), num_inputs * sizeof(float));
            file.read(reinterpret_cast<char*>(m_weights[i].data()), num_inputs * sizeof(float));
            file.read(reinterpret_cast<char*>(v_weights[i].data()), num_inputs * sizeof(float));
        }
        file.read(reinterpret_cast<char*>(biases.data()), num_outputs * sizeof(float));
        file.read(reinterpret_cast<char*>(m_biases.data()), num_outputs * sizeof(float));
        file.read(reinterpret_cast<char*>(v_biases.data()), num_outputs * sizeof(float));
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
                std::distance(step_probs.begin(), std::max_element(step_probs.begin(), step_probs.end()))
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
// 6. MASTER DYNAMIC HTR NETWORK
// ============================================================================
class SequenceHTRNetwork {
public:
    int num_layers;
    std::vector<ConvLayer> conv_layers;
    std::vector<ReLULayer> relu_layers; // Bug fix: Dedicated memory instance per layer
    std::vector<MaxPoolLayer> pool_layers;
    SequenceDenseLayer dense;
    CTCDecoder decoder;

    int final_F, final_H, final_W;

    // Pre-allocated structural memory to fix Heap allocation thrashing
    std::vector<vctr> conv_outs, relu_outs, pool_outs;
    std::vector<vctr> conv_d_ins, relu_d_ins, pool_d_ins;
    mtrx seq_features, dense_out, dense_d_in;
    vctr d_conv_out;

    SequenceHTRNetwork(int layers = 2)
        : num_layers(std::clamp(layers, 1, 3)),
          dense(1, 1),
          decoder("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ", 62)
    {
        int curr_C = 1;
        int curr_H = 32;
        int curr_W = 128;
        int filters = 32; 

        conv_outs.resize(num_layers);
        relu_outs.resize(num_layers);
        pool_outs.resize(num_layers);
        conv_d_ins.resize(num_layers);
        relu_d_ins.resize(num_layers);
        pool_d_ins.resize(num_layers);

        for (int i = 0; i < num_layers; ++i) {
            conv_layers.emplace_back(filters, curr_C, curr_H, curr_W, 3);
            relu_layers.emplace_back();
            curr_H -= 2; curr_W -= 2; curr_C = filters;

            conv_outs[i].resize(filters * curr_H * curr_W);
            conv_d_ins[i].resize(curr_C * (curr_H + 2) * (curr_W + 2));

            relu_outs[i].resize(filters * curr_H * curr_W);
            relu_d_ins[i].resize(filters * curr_H * curr_W);

            pool_layers.emplace_back(filters, curr_H, curr_W, 2);
            curr_H /= 2; curr_W /= 2;

            pool_outs[i].resize(filters * curr_H * curr_W);
            pool_d_ins[i].resize(filters * (curr_H * 2) * (curr_W * 2));

            filters *= 2;
        }

        final_F = conv_layers.back().F;
        final_H = curr_H;
        final_W = curr_W;

        dense = SequenceDenseLayer(final_F * final_H, 63);

        seq_features.resize(final_W, vctr(final_F * final_H, 0.0f));
        dense_out.resize(final_W, vctr(63, 0.0f));
        dense_d_in.resize(final_W, vctr(final_F * final_H, 0.0f));
        d_conv_out.resize(final_F * final_H * final_W, 0.0f);
    }

    mtrx forward(const vctr& input_pixels) {
        if (input_pixels.size() != 32 * 128) {
            throw std::invalid_argument("Input pixel array must contain exactly 4096 elements.");
        }

        const vctr* current = &input_pixels;
        for (int i = 0; i < num_layers; ++i) {
            conv_layers[i].forward(*current, conv_outs[i]);
            relu_layers[i].forward(conv_outs[i], relu_outs[i]);
            pool_layers[i].forward(relu_outs[i], pool_outs[i]);
            current = &pool_outs[i];
        }

        // Flatten to sequence map
        for (int x = 0; x < final_W; ++x) {
            for (int f = 0; f < final_F; ++f) {
                for (int y = 0; y < final_H; ++y) {
                    int tensor_idx = f * (final_H * final_W) + y * final_W + x;
                    int feature_idx = f * final_H + y;
                    seq_features[x][feature_idx] = (*current)[tensor_idx];
                }
            }
        }

        dense.forward(seq_features, dense_out);

        // Softmax
        mtrx probabilities(final_W, vctr(63, 0.0f));
        for (int t = 0; t < final_W; ++t) {
            float max_logit = *std::max_element(dense_out[t].begin(), dense_out[t].end());
            float sum_exp = 0.0f;
            for (size_t v = 0; v < 63; ++v) {
                probabilities[t][v] = std::exp(dense_out[t][v] - max_logit);
                sum_exp += probabilities[t][v];
            }
            for (size_t v = 0; v < 63; ++v) {
                probabilities[t][v] /= sum_exp;
            }
        }
        return probabilities;
    }

    float accumulate_gradients(const vctr& input_pixels, const std::string& target_text) {
        mtrx probs = forward(input_pixels);
        size_t time_steps = probs.size();
        std::string dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ";

        std::vector<int> tokens;
        for(char c : target_text) {
            auto pos = dictionary.find(c);
            if(pos != std::string::npos) tokens.push_back(static_cast<int>(pos));
        }

        int L = tokens.size();
        int S = 2 * L + 1;
        
        if (S > static_cast<int>(time_steps)) return 0.0f; // Target impossible for receptive field

        std::vector<int> S_labels(S, 62);
        for(int i = 0; i < L; ++i) S_labels[2*i + 1] = tokens[i];

        // --------------------------------------------------------------------
        // TRUE CTC LOSS: Scaled Forward (Alpha) / Backward (Beta) Pass
        // --------------------------------------------------------------------
        mtrx alpha(time_steps, vctr(S, 0.0f));
        vctr c(time_steps, 0.0f); // Scaling factors prevents float underflow
        
        alpha[0][0] = probs[0][62];
        if(S > 1) alpha[0][1] = probs[0][S_labels[1]];
        for(int s=0; s<S; ++s) c[0] += alpha[0][s];
        if (c[0] <= 0.0f) c[0] = 1e-10f;
        for(int s=0; s<S; ++s) alpha[0][s] /= c[0];

        for(int t = 1; t < static_cast<int>(time_steps); ++t) {
            for(int s = 0; s < S; ++s) {
                float val = alpha[t-1][s];
                if(s > 0) val += alpha[t-1][s-1];
                if(s > 1 && S_labels[s] != 62 && S_labels[s] != S_labels[s-2])
                    val += alpha[t-1][s-2];
                alpha[t][s] = val * probs[t][S_labels[s]];
                c[t] += alpha[t][s];
            }
            if (c[t] <= 0.0f) c[t] = 1e-10f;
            for(int s=0; s<S; ++s) alpha[t][s] /= c[t];
        }

        mtrx beta(time_steps, vctr(S, 0.0f));
        beta[time_steps-1][S-1] = 1.0f;
        if(S > 1) beta[time_steps-1][S-2] = 1.0f;
        for(int s=0; s<S; ++s) beta[time_steps-1][s] /= c[time_steps-1];

        for(int t = static_cast<int>(time_steps)-2; t >= 0; --t) {
            for(int s = 0; s < S; ++s) {
                float val = beta[t+1][s] * probs[t+1][S_labels[s]];
                if(s < S-1) val += beta[t+1][s+1] * probs[t+1][S_labels[s+1]];
                if(s < S-2 && S_labels[s] != 62 && S_labels[s] != S_labels[s+2])
                    val += beta[t+1][s+2] * probs[t+1][S_labels[s+2]];
                beta[t][s] = val;
            }
            for(int s=0; s<S; ++s) beta[t][s] /= c[t];
        }

        mtrx d_logits(time_steps, vctr(63, 0.0f));
        for(int t = 0; t < static_cast<int>(time_steps); ++t) {
            vctr posterior(63, 0.0f);
            float sum_ab = 0.0f;
            for(int s = 0; s < S; ++s) {
                float ab = alpha[t][s] * beta[t][s];
                posterior[S_labels[s]] += ab;
                sum_ab += ab;
            }
            for(int v = 0; v < 63; ++v) {
                if(sum_ab > 0.0f) posterior[v] /= sum_ab;
                d_logits[t][v] = std::clamp(probs[t][v] - posterior[v], -5.0f, 5.0f);
            }
        }

        float total_loss = 0.0f;
        for(int t = 0; t < static_cast<int>(time_steps); ++t) {
            if(c[t] > 0.0f) total_loss -= std::log(c[t]);
        }

        // --------------------------------------------------------------------
        // BACKWARD PROPAGATION
        // --------------------------------------------------------------------
        dense.backward(d_logits, dense_d_in);

        for (int x = 0; x < final_W; ++x) {
            for (int f = 0; f < final_F; ++f) {
                for (int y = 0; y < final_H; ++y) {
                    int tensor_idx = f * (final_H * final_W) + y * final_W + x;
                    int feature_idx = f * final_H + y;
                    d_conv_out[tensor_idx] = dense_d_in[x][feature_idx];
                }
            }
        }

        const vctr* current_grad = &d_conv_out;
        for (int i = num_layers - 1; i >= 0; --i) {
            pool_layers[i].backward(*current_grad, pool_d_ins[i]);
            relu_layers[i].backward(pool_d_ins[i], relu_d_ins[i]);
            conv_layers[i].backward(relu_d_ins[i], conv_d_ins[i]);
            current_grad = &conv_d_ins[i];
        }

        return total_loss / time_steps;
    }

    void apply_gradients(float learning_rate, int batch_size) {
        dense.update_weights(learning_rate, batch_size);
        dense.reset_gradients();
        for (int i = 0; i < num_layers; ++i) {
            conv_layers[i].update_weights(learning_rate, batch_size);
            conv_layers[i].reset_gradients();
        }
    }

    std::string predict(const vctr& input_pixels) {
        return decoder.decode(forward(input_pixels));
    }

    bool saveModel(const std::string& filepath) const {
        std::ofstream file(filepath, std::ios::binary);
        if (!file.is_open()) return false;

        file.write(reinterpret_cast<const char*>(&num_layers), sizeof(int));
        for (const auto& conv : conv_layers) conv.save(file);
        dense.save(file);
        file.close();
        return true;
    }

    bool loadModel(const std::string& filepath) {
        std::ifstream file(filepath, std::ios::binary);
        if (!file.is_open()) return false;

        int loaded_layers;
        file.read(reinterpret_cast<char*>(&loaded_layers), sizeof(int));

        if (loaded_layers != num_layers) {
            *this = SequenceHTRNetwork(loaded_layers);
        }

        for (auto& conv : conv_layers) conv.load(file);
        dense.load(file);
        file.close();
        return true;
    }
};

#endif // CNN_ENGINE_HPP