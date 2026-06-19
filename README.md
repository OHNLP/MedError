# MedError

**MedError** is an open-source framework for systematic error analysis of clinical NLP and large language model (LLM) outputs in electronic health record (EHR)-based concept extraction. It provides a structured error taxonomy, an LLM-assisted annotation interface, and visual analytics for multi-site clinical NLP evaluation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌐 Live Demo

Try the app: **https://ohnlp.org/MedError/**

![App Screenshot](assets/screenshots.gif)

---

## Overview

MedError supports a three-step workflow:

1. **Configure** — upload an annotation guideline (YAML) and select or upload an error taxonomy
2. **Load** — upload model predictions (JSON or CSV) containing gold-standard labels and model outputs
3. **Analyze** — review LLM-generated error categorizations, override as needed, and export results

The error taxonomy covers six dimensions — Annotation, Contextual, Linguistic, Logic, Output/Generation, and Other — with support for both rule-based and transformer/LLM model types.

---

## Citation

If you use MedError in your research, please cite:

> Liu H, Fu S, Lu Q, Ahn J, Chen F, Yin H, Wen J, Yue Z, Harrison T, Jun J, Ruan X. MedError: A Machine-Assisted Framework for Systematic Error Analysis in Clinical Concept Extraction. Research Square. 2025 Sep 17:rs-3.

---

## Quickstart

### Option A — No install (recommended)

Download [`index.html`](https://github.com/OHNLP/MedError/releases/tag/v2.1.0) from this repo and open it directly in a browser. No server or build step required — the entire app is bundled into a single file.

### Option B — Run from source

Requires Node.js ≥ 18 and pnpm ≥ 8.

```sh
cd error-analysis-web-app-source
pnpm install
pnpm dev        # development server at http://localhost:5173
pnpm build      # production build → dist/index.html
```

---

## Input Format

MedError accepts **JSON** or **CSV** files containing one row per model prediction. Each row must include:

| Field | Type | Description |
|---|---|---|
| `input` | string | The clinical text span being evaluated |
| `gold_standard` | string or null | The correct label (null = no annotation expected) |
| `LLM_prediction` | string or null | The model's predicted label |
| `FP_FN` | `"FP"` or `"FN"` | Whether this is a false positive or false negative |
| `model_type` | string | Model identifier (e.g., `"Rule-based"`, `"GPT-4"`) |
| `concept_category` | string | *(optional)* Concept class for grouping (auto-filled from `gold_standard` if omitted) |
| `error_type` | string | *(optional)* Pre-assigned error label; can be set or overridden in the UI |

Download a ready-to-use example from the app's **Upload Errors** tab, or from [`sample_data/error_input_examples.csv`](sample_data/error_input_examples.csv).

### Annotation Guideline (YAML)

Upload a YAML file that defines gold-standard annotation rules for your target concept. See [`sample_data/annotation_guideline_example.yaml`](sample_data/annotation_guideline_example.yaml) for a delirium-domain example.

### Error Taxonomy (YAML)

The app ships with two built-in MedError taxonomies (sub-class and class level). You can also upload a custom YAML taxonomy — see the **Concept Extraction Guideline** tab for the expected format.

---

## Error Taxonomy

The full taxonomy is defined in [`Taxonomy/error_taxonomy_v2_1.md`](Taxonomy/error_taxonomy_v2_1.md).

Six error dimensions are supported:

| Dimension | Description |
|---|---|
| Annotation Error | Human labeling errors in the gold standard |
| Contextual Error | Errors from misinterpreting clinical context (negation, certainty, section, subject, temporality) |
| Linguistic Error | Surface-form errors (morphology, spelling, abbreviation, synonyms, syntax) |
| Logic Error | Rule or pattern misspecification, hallucination, over-extraction |
| Output / Generation Error | LLM-specific failures: verbosity, inconsistency, sycophancy |
| Other Error | Incomplete extraction, dictionary errors, normalization errors |

---

## LLM Configuration

MedError can call an LLM to automatically suggest an error class and reasoning for each FP/FN case. Supported providers:

- **Azure OpenAI** — requires endpoint, deployment name, and API key
- **Ollama** — local inference via OpenAI-compatible endpoint (e.g., `http://localhost:11434`)

Configure the provider in the **LLM Config** sidebar panel before running analysis.

---

## Expected Output

After loading the error file, MedError provides:

- **Analysis Summary** — total FP/FN counts, per-concept breakdown, and corpus statistics
- **Upload Errors** — per-case LLM suggestion, reasoning, and manual override controls
- **Error Visualization** — Sankey diagram and frequency charts across error dimensions
- **Multi-site Comparison** — side-by-side error distribution across studies or sites
- **Export** — downloadable CSV/JSON of all categorized errors with metadata

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.
