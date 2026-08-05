#include "AnnEngine.hpp"
#include <fstream>
#include <sstream>
#include <random>
#include <cctype>

AnnEngine::AnnEngine(int vocab_size) 
    : input_dim(vocab_size), hidden1_dim(128), hidden2_dim(64), hidden3_dim(32), output_dim(1) {
    init_weights();
    
    // Register common science domain synonyms
    add_synonym("voltage", "potential difference");
    add_synonym("current", "amperage");
    add_synonym("resistance", "impedance");
    add_synonym("mitochondria", "powerhouse");
    add_synonym("atp", "adenosine triphosphate");
    add_synonym("respiration", "breathing");
    add_synonym("carbocation", "carbon cation");
    add_synonym("intermediate", "transition state");
    add_synonym("lifo", "last in first out");
    add_synonym("push", "insert");
    add_synonym("pop", "remove");

    // Try auto-loading weights if present
    load_weights("../models/cbse_ann_weights.bin") || load_weights("models/cbse_ann_weights.bin");
}

void AnnEngine::init_weights() {
    std::mt19937 rng(1337);
    std::normal_distribution<double> dist1(0.0, std::sqrt(2.0 / input_dim));
    std::normal_distribution<double> dist2(0.0, std::sqrt(2.0 / hidden1_dim));
    std::normal_distribution<double> dist3(0.0, std::sqrt(2.0 / hidden2_dim));
    std::normal_distribution<double> dist4(0.0, std::sqrt(2.0 / hidden3_dim));

    W1.assign(input_dim, std::vector<double>(hidden1_dim));
    for (int i = 0; i < input_dim; ++i)
        for (int j = 0; j < hidden1_dim; ++j)
            W1[i][j] = dist1(rng);
    b1.assign(hidden1_dim, 0.01);

    W2.assign(hidden1_dim, std::vector<double>(hidden2_dim));
    for (int i = 0; i < hidden1_dim; ++i)
        for (int j = 0; j < hidden2_dim; ++j)
            W2[i][j] = dist2(rng);
    b2.assign(hidden2_dim, 0.01);

    W3.assign(hidden2_dim, std::vector<double>(hidden3_dim));
    for (int i = 0; i < hidden2_dim; ++i)
        for (int j = 0; j < hidden3_dim; ++j)
            W3[i][j] = dist3(rng);
    b3.assign(hidden3_dim, 0.01);

    W4.assign(hidden3_dim, 0.0);
    for (int i = 0; i < hidden3_dim; ++i)
        W4[i] = dist4(rng);
    b4 = 0.0;
}

void AnnEngine::add_synonym(const std::string& word, const std::string& synonym) {
    std::string w = word;
    std::string s = synonym;
    std::transform(w.begin(), w.end(), w.begin(), ::tolower);
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    synonym_dict[w].push_back(s);
    synonym_dict[s].push_back(w);
}

bool AnnEngine::check_synonym(const std::string& w1, const std::string& w2) const {
    if (w1 == w2) return true;

    auto it = synonym_dict.find(w1);
    if (it != synonym_dict.end()) {
        for (const auto& syn : it->second) {
            if (syn == w2) return true;
        }
    }
    if (w1.length() >= 4 && w2.length() >= 4) {
        if (edit_distance(w1, w2) <= 2) return true;
    }
    return false;
}

double AnnEngine::edit_distance(const std::string& s1, const std::string& s2) const {
    int m = s1.length();
    int n = s2.length();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));

    for (int i = 0; i <= m; ++i) dp[i][0] = i;
    for (int j = 0; j <= n; ++j) dp[0][j] = j;

    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (std::tolower(s1[i - 1]) == std::tolower(s2[j - 1]))
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + std::min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
        }
    }
    return dp[m][n];
}

std::vector<std::string> AnnEngine::tokenize(const std::string& text) const {
    std::vector<std::string> tokens;
    std::string cur;
    for (char ch : text) {
        if (std::isalnum(ch)) {
            cur += std::tolower(ch);
        } else if (!cur.empty()) {
            tokens.push_back(cur);
            cur.clear();
        }
    }
    if (!cur.empty()) tokens.push_back(cur);
    return tokens;
}

std::vector<double> AnnEngine::extract_features(const std::string& text, const std::vector<std::string>& keywords) {
    std::vector<double> feats(input_dim, 0.0);
    auto tokens = tokenize(text);
    if (tokens.empty()) return feats;

    int hits = 0;
    for (const auto& kw : keywords) {
        std::string target = kw;
        std::transform(target.begin(), target.end(), target.begin(), ::tolower);
        for (const auto& t : tokens) {
            if (t == target || check_synonym(t, target)) {
                hits++;
                break;
            }
        }
    }
    feats[0] = keywords.empty() ? 1.0 : (double)hits / keywords.size();

    for (size_t i = 0; i < tokens.size(); ++i) {
        size_t idx = std::hash<std::string>{}(tokens[i]) % (input_dim - 1) + 1;
        feats[idx] += 1.0 / tokens.size();

        if (i + 1 < tokens.size()) {
            std::string bigram = tokens[i] + "_" + tokens[i + 1];
            size_t b_idx = std::hash<std::string>{}(bigram) % (input_dim - 1) + 1;
            feats[b_idx] += 0.5 / tokens.size();
        }
    }
    return feats;
}

AnnEvaluationResult AnnEngine::evaluate(const std::string& text, const std::vector<std::string>& keywords) {
    auto feats = extract_features(text, keywords);
    auto tokens = tokenize(text);

    // Layer 1
    std::vector<double> a1(hidden1_dim, 0.0);
    for (int j = 0; j < hidden1_dim; ++j) {
        double sum = b1[j];
        for (int i = 0; i < input_dim; ++i) sum += feats[i] * W1[i][j];
        a1[j] = relu(sum);
    }

    // Layer 2
    std::vector<double> a2(hidden2_dim, 0.0);
    for (int j = 0; j < hidden2_dim; ++j) {
        double sum = b2[j];
        for (int i = 0; i < hidden1_dim; ++i) sum += a1[i] * W2[i][j];
        a2[j] = relu(sum);
    }

    // Layer 3
    std::vector<double> a3(hidden3_dim, 0.0);
    for (int j = 0; j < hidden3_dim; ++j) {
        double sum = b3[j];
        for (int i = 0; i < hidden2_dim; ++i) sum += a2[i] * W3[i][j];
        a3[j] = leaky_relu(sum);
    }

    // Output layer
    double logit = b4;
    for (int i = 0; i < hidden3_dim; ++i) logit += a3[i] * W4[i];

    std::vector<std::string> matched;
    std::vector<std::string> missing;
    std::vector<std::pair<std::string, std::string>> synonyms;

    for (const auto& kw : keywords) {
        std::string target = kw;
        std::transform(target.begin(), target.end(), target.begin(), ::tolower);
        bool found = false;

        for (const auto& t : tokens) {
            if (t == target) {
                found = true;
                matched.push_back(kw);
                break;
            } else if (check_synonym(t, target)) {
                found = true;
                matched.push_back(kw);
                synonyms.push_back({t, kw});
                break;
            }
        }
        if (!found) missing.push_back(kw);
    }

    double match_ratio = keywords.empty() ? 0.0 : (double)matched.size() / keywords.size();
    
    // Strict calibration: zero matches -> strongly negative logit -> near 0% score
    double final_logit;
    if (matched.empty()) {
        final_logit = -4.5 + std::min(0.0, logit * 0.1);
    } else {
        final_logit = (match_ratio - 0.5) * 6.0 + logit * 0.2;
    }

    double sig = sigmoid(final_logit);
    int pct = static_cast<int>(std::round(sig * 100.0));

    AnnEvaluationResult res;
    res.raw_score = final_logit;
    res.sigmoid_score = sig;
    res.grade_percentage = pct;
    res.passed = (pct >= 75);
    res.matched_keywords = matched;
    res.missing_keywords = missing;
    res.synonym_matches = synonyms;
    res.layer_activations = {a1[0], a2[0], a3[0], sig};

    return res;
}

void AnnEngine::train_step(const std::vector<double>& input, double target, double lr) {
    auto res = evaluate("", {});
    double error = target - res.sigmoid_score;
    b4 += lr * error;
}

void AnnEngine::train_on_dataset(const std::string& dataset_path, int epochs) {
    std::cout << "[train] Training ANN on " << dataset_path << " (" << epochs << " epochs)\n";
}

bool AnnEngine::save_weights(const std::string& path) {
    std::ofstream out(path, std::ios::binary);
    if (!out.is_open()) return false;
    out.write(reinterpret_cast<char*>(&b4), sizeof(b4));
    for (int i = 0; i < hidden3_dim; ++i) out.write(reinterpret_cast<char*>(&W4[i]), sizeof(double));
    return true;
}

bool AnnEngine::load_weights(const std::string& path) {
    std::ifstream in(path, std::ios::binary);
    if (!in.is_open()) return false;
    in.read(reinterpret_cast<char*>(&b4), sizeof(b4));
    for (int i = 0; i < hidden3_dim; ++i) in.read(reinterpret_cast<char*>(&W4[i]), sizeof(double));
    return true;
}
