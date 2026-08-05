#ifndef ANN_ENGINE_HPP
#define ANN_ENGINE_HPP

#include <vector>
#include <string>
#include <unordered_map>
#include <cmath>
#include <algorithm>
#include <memory>
#include <iostream>

struct AnnEvaluationResult {
    double raw_score;
    double sigmoid_score;
    int grade_percentage;
    bool passed;
    std::vector<std::string> matched_keywords;
    std::vector<std::string> missing_keywords;
    std::vector<std::pair<std::string, std::string>> synonym_matches;
    std::vector<double> layer_activations;
};

class AnnEngine {
private:
    int input_dim;
    int hidden1_dim;
    int hidden2_dim;
    int hidden3_dim;
    int output_dim;

    // Weight matrices & bias vectors
    std::vector<std::vector<double>> W1;
    std::vector<double> b1;
    std::vector<std::vector<double>> W2;
    std::vector<double> b2;
    std::vector<std::vector<double>> W3;
    std::vector<double> b3;
    std::vector<double> W4;
    double b4;

    std::unordered_map<std::string, std::vector<std::string>> synonym_dict;

    // Activation utilities
    double relu(double x) const { return x > 0.0 ? x : 0.0; }
    double leaky_relu(double x) const { return x > 0.0 ? x : 0.01 * x; }
    double sigmoid(double x) const { return 1.0 / (1.0 + std::exp(-x)); }

    std::vector<std::string> tokenize(const std::string& text) const;
    double edit_distance(const std::string& s1, const std::string& s2) const;

public:
    explicit AnnEngine(int vocab_size = 256);
    void init_weights();

    void add_synonym(const std::string& word, const std::string& synonym);
    bool check_synonym(const std::string& w1, const std::string& w2) const;

    std::vector<double> extract_features(const std::string& text, const std::vector<std::string>& keywords);
    AnnEvaluationResult evaluate(const std::string& text, const std::vector<std::string>& keywords);

    void train_step(const std::vector<double>& input, double target, double lr = 0.01);
    void train_on_dataset(const std::string& dataset_path, int epochs = 3);

    bool save_weights(const std::string& path);
    bool load_weights(const std::string& path);
};

#endif // ANN_ENGINE_HPP
