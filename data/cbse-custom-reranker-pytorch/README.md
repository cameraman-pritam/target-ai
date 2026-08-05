---
tags:
- sentence-transformers
- cross-encoder
- reranker
- generated_from_trainer
- dataset_size:25566
- loss:BinaryCrossEntropyLoss
pipeline_tag: text-ranking
library_name: sentence-transformers
---

# CrossEncoder

This is a [Cross Encoder](https://www.sbert.net/docs/cross_encoder/usage/usage.html) model trained using the [sentence-transformers](https://www.SBERT.net) library. It computes scores for pairs of texts, which can be used for text reranking and semantic search.

## Model Details

### Model Description
- **Model Type:** Cross Encoder
<!-- - **Base model:** [Unknown](https://huggingface.co/unknown) -->
- **Maximum Sequence Length:** 512 tokens
- **Number of Output Labels:** 1 label
- **Supported Modality:** Text
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Documentation:** [Cross Encoder Documentation](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Cross Encoders on Hugging Face](https://huggingface.co/models?library=sentence-transformers&other=cross-encoder)

### Full Model Architecture

```
CrossEncoder(
  (0): Transformer({'transformer_task': 'sequence-classification', 'modality_config': {'text': {'method': 'forward', 'method_output_name': 'logits'}}, 'module_output_name': 'scores', 'architecture': 'BertForSequenceClassification'})
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import CrossEncoder

# Download from the 🤗 Hub
model = CrossEncoder("cross_encoder_model_id")
# Get scores for pairs of inputs
pairs = [
    ['Describe the components of a nucleotide.', 'A nucleotide consists of three components: a nitrogenous base, a five-carbon sugar (either ribose or deoxyribose), and a phosphate group.'],
    ['Provide an example of an electrophilic substitution reaction in a haloarene that requires more drastic conditions compared to benzene.', 'Metastasis is the process by which cancer cells spread from the primary tumor to other parts of the body. This occurs when cancer cells break away from the original tumor, travel through the bloodstream or lymphatic system, and form new tumors in distant organs or tissues.'],
    ['Describe the process of producing human insulin using bacteria.', '[Co(NH3)6]3+ is an inner orbital complex with a low-spin d6 configuration, making it diamagnetic. [Ni(NH3)6]2+ is an outer orbital complex with a high-spin d8 configuration, making it paramagnetic. The difference arises from the splitting of the d-orbitals due to the ligand field strength and the electronic configuration of the central metal ion.'],
    ['If the electric field passing through an area of 2 mÂ² is 5 V/m, what is the electric flux?', 'An example of a material that does not obey Ohmâ€™s Law is GaAs, where the relationship between voltage and current is non-unique. A rectifier is another example that combines non-linear and sign-dependent features.'],
    ['What is the term used to describe the energy that holds the nucleus of an atom together?', "The electrostatic force between two charges is given by F = k(q1q2/r^2), where k is Coulomb's constant, q1 and q2 are the charges, and r is the distance between them. When the distance is halved, the force would normally increase by a factor of 4. However, since the charges are redistributed and each sphere now carries half the original charge, the product q1q2 is reduced by a factor of 4, thus keeping the force unaltered."],
]
scores = model.predict(pairs)
print(scores)
# [ 10.7881  -9.2592 -10.1247 -10.3124  -9.7262]

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'Describe the components of a nucleotide.',
    [
        'A nucleotide consists of three components: a nitrogenous base, a five-carbon sugar (either ribose or deoxyribose), and a phosphate group.',
        'Metastasis is the process by which cancer cells spread from the primary tumor to other parts of the body. This occurs when cancer cells break away from the original tumor, travel through the bloodstream or lymphatic system, and form new tumors in distant organs or tissues.',
        '[Co(NH3)6]3+ is an inner orbital complex with a low-spin d6 configuration, making it diamagnetic. [Ni(NH3)6]2+ is an outer orbital complex with a high-spin d8 configuration, making it paramagnetic. The difference arises from the splitting of the d-orbitals due to the ligand field strength and the electronic configuration of the central metal ion.',
        'An example of a material that does not obey Ohmâ€™s Law is GaAs, where the relationship between voltage and current is non-unique. A rectifier is another example that combines non-linear and sign-dependent features.',
        "The electrostatic force between two charges is given by F = k(q1q2/r^2), where k is Coulomb's constant, q1 and q2 are the charges, and r is the distance between them. When the distance is halved, the force would normally increase by a factor of 4. However, since the charges are redistributed and each sphere now carries half the original charge, the product q1q2 is reduced by a factor of 4, thus keeping the force unaltered.",
    ]
)
# [{'corpus_id': ..., 'score': ...}, {'corpus_id': ..., 'score': ...}, ...]
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset

* Size: 25,566 training samples
* Columns: <code>sentence_0</code>, <code>sentence_1</code>, and <code>label</code>
* Approximate statistics based on the first 100 samples:
  |          | sentence_0                                                                        | sentence_1                                                                        | label                                                          |
  |:---------|:----------------------------------------------------------------------------------|:----------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type     | string                                                                            | string                                                                            | float                                                          |
  | modality | text                                                                              | text                                                                              |                                                                |
  | details  | <ul><li>min: 6 tokens</li><li>mean: 20.25 tokens</li><li>max: 69 tokens</li></ul> | <ul><li>min: 3 tokens</li><li>mean: 50.6 tokens</li><li>max: 214 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.53</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence_0                                                                                                                                          | sentence_1                                                                                                                                                                                                                                                                                                                                                                | label            |
  |:----------------------------------------------------------------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------|
  | <code>Describe the components of a nucleotide.</code>                                                                                               | <code>A nucleotide consists of three components: a nitrogenous base, a five-carbon sugar (either ribose or deoxyribose), and a phosphate group.</code>                                                                                                                                                                                                                    | <code>1.0</code> |
  | <code>Provide an example of an electrophilic substitution reaction in a haloarene that requires more drastic conditions compared to benzene.</code> | <code>Metastasis is the process by which cancer cells spread from the primary tumor to other parts of the body. This occurs when cancer cells break away from the original tumor, travel through the bloodstream or lymphatic system, and form new tumors in distant organs or tissues.</code>                                                                            | <code>0.0</code> |
  | <code>Describe the process of producing human insulin using bacteria.</code>                                                                        | <code>[Co(NH3)6]3+ is an inner orbital complex with a low-spin d6 configuration, making it diamagnetic. [Ni(NH3)6]2+ is an outer orbital complex with a high-spin d8 configuration, making it paramagnetic. The difference arises from the splitting of the d-orbitals due to the ligand field strength and the electronic configuration of the central metal ion.</code> | <code>0.0</code> |
* Loss: [<code>BinaryCrossEntropyLoss</code>](https://sbert.net/docs/package_reference/cross_encoder/losses.html#binarycrossentropyloss) with these parameters:
  ```json
  {
      "activation_fn": "torch.nn.modules.linear.Identity",
      "pos_weight": null
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 4
- `per_device_eval_batch_size`: 16

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 4
- `max_steps`: -1
- `learning_rate`: 5e-05
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: None
- `warmup_steps`: 0
- `optim`: adamw_torch_fused
- `optim_args`: None
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `optim_target_modules`: None
- `gradient_accumulation_steps`: 1
- `average_tokens_across_devices`: True
- `max_grad_norm`: 1
- `label_smoothing_factor`: 0.0
- `bf16`: False
- `fp16`: False
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `use_cache`: False
- `neftune_noise_alpha`: None
- `torch_empty_cache_steps`: None
- `auto_find_batch_size`: False
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `include_num_input_tokens_seen`: no
- `log_level`: passive
- `log_level_replica`: warning
- `disable_tqdm`: False
- `project`: huggingface
- `trackio_space_id`: None
- `trackio_bucket_id`: None
- `trackio_static_space_id`: None
- `per_device_eval_batch_size`: 16
- `prediction_loss_only`: True
- `eval_on_start`: False
- `eval_do_concat_batches`: True
- `eval_use_gather_object`: False
- `eval_accumulation_steps`: None
- `include_for_metrics`: []
- `batch_eval_metrics`: False
- `save_only_model`: False
- `save_on_each_node`: False
- `enable_jit_checkpoint`: False
- `push_to_hub`: False
- `hub_private_repo`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_always_push`: False
- `hub_revision`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `restore_callback_states_from_checkpoint`: False
- `full_determinism`: False
- `seed`: 42
- `data_seed`: None
- `use_cpu`: False
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `dataloader_prefetch_factor`: None
- `remove_unused_columns`: True
- `label_names`: None
- `train_sampling_strategy`: random
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `ddp_static_graph`: None
- `ddp_backend`: None
- `ddp_timeout`: 1800
- `fsdp`: None
- `fsdp_config`: None
- `deepspeed`: None
- `debug`: []
- `skip_memory_metrics`: True
- `do_predict`: False
- `resume_from_checkpoint`: None
- `warmup_ratio`: None
- `local_rank`: -1
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: proportional
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Training Logs
| Epoch  | Step | Training Loss |
|:------:|:----:|:-------------:|
| 0.3129 | 500  | 0.3724        |
| 0.6258 | 1000 | 0.1166        |
| 0.9387 | 1500 | 0.1014        |
| 1.2516 | 2000 | 0.0932        |
| 1.5645 | 2500 | 0.0856        |
| 1.8773 | 3000 | 0.0830        |
| 2.1902 | 3500 | 0.0818        |
| 2.5031 | 4000 | 0.0764        |
| 2.8160 | 4500 | 0.0709        |
| 3.1289 | 5000 | 0.0879        |
| 3.4418 | 5500 | 0.0653        |
| 3.7547 | 6000 | 0.0700        |


### Training Time
- **Training**: 18.8 minutes

### Framework Versions
- Python: 3.14.6
- Sentence Transformers: 5.6.1
- Transformers: 5.14.1
- PyTorch: 2.13.0+cu130
- Accelerate: 1.14.0
- Datasets: 5.0.1
- Tokenizers: 0.22.2

## Additional Resources

- [Training and Finetuning Reranker Models with Sentence Transformers](https://huggingface.co/blog/train-reranker): the end-to-end guide for training or finetuning Cross Encoder (reranker) models.
- [Multimodal Embedding & Reranker Models with Sentence Transformers](https://huggingface.co/blog/multimodal-sentence-transformers): use text, image, audio, and video reranker models through the same API.
- [Training and Finetuning Multimodal Embedding & Reranker Models with Sentence Transformers](https://huggingface.co/blog/train-multimodal-sentence-transformers): training multimodal Cross Encoders.

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->