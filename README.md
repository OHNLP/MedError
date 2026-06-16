# MedError

**MedError** is an open-source framework for systematic error analysis of clinical NLP and large language model (LLM) outputs in electronic health record (EHR)-based concept extraction. It provides a structured error taxonomy, an LLM-assisted annotation interface, and visual analytics for multi-site clinical NLP evaluation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DOI](https://img.shields.io/badge/DOI-10.xxxx%2Fxxxxx-blue)](https://doi.org/10.xxxx/xxxxx)

---

## 🌐 Live Demo

Try the app: **https://ohnlp.org/MedError/**

![App Screenshot](assets/screenshots.gif)

---

## Overview

MedError supports a three-step workflow:

1. **Upload** an annotation guideline (YAML) and error definition file (YAML)
2. **Load** model predictions (JSON) for analysis
3. **Review** LLM-generated error categorizations and export results

The error taxonomy covers six dimensions — Annotation, Contextual, Linguistic, Logic, Generation, and Other errors — with support for both rule-based and transformer/LLM model types.

---

## Citation

If you use MedError in your research, please cite:

> Liu H, Fu S, Lu Q, Ahn J, Chen F, Yin H, Wen J, Yue Z, Harrison T, Jun J, Ruan X. MedError: A Machine-Assisted Framework for Systematic Error Analysis in Clinical Concept Extraction. Research Square. 2025 Sep 17:rs-3.

---

## Requirements

- Node.js >= 18.x
- pnpm >= 8.x

---

## Installation

```sh
pnpm install
```

---

## Usage

### Development

```sh
pnpm dev
```

Opens the app at `http://localhost:5173` with hot-reload enabled.

### Production Build

```sh
pnpm build
```

Output is written to `dist/`. Type-checking is performed via `vue-tsc` before bundling.

### Lint

```sh
pnpm lint
```

---

## Input Format

MedError expects three input files:

| File | Format | Description |
|---|---|---|
| `step1_annotation_guideline.yaml` | YAML | Defines the gold-standard annotation rules for the target concept (e.g., delirium, fall) |
| `step2_error_definition.yaml` | YAML | Specifies the error taxonomy to apply during analysis |
| `step3_input.json` | JSON | Model predictions with gold-standard labels for each input span |

Example input structure for `step3_input.json`:

```json
[
  {
    "input": "Patient fell last night.",
    "prediction_label": "Fall",
    "gold_standard": "Fall",
    "model_type": "Rule-based"
  },
  {
    "input": "miss-stepped, he went down with a sudden knee flexion",
    "prediction_label": null,
    "gold_standard": "Fall",
    "model_type": "Rule-based"
  }
]
```

---

## Expected Output

After loading all three files, MedError produces:

- **Analysis Summary**: total annotations, false positives (FP), and false negatives (FN)
- **Error Analysis Details**: per-case LLM prediction, reasoning, and error category assignment
- **Exportable report**: downloadable CSV/JSON of categorized errors

---

## Error Taxonomy

The full taxonomy is available at [`Taxonomy/error_taxonomy.md`](Taxonomy/error_taxonomy_v2_1).

Six error dimensions are supported:

| Dimension | Description |
|---|---|
| Annotation Error | Human labeling errors in the gold standard |
| Contextual Error | Errors from misinterpreting clinical context (negation, certainty, section, subject, temporality) |
| Linguistic Error | Surface-form errors (morphology, spelling, abbreviation, synonyms, syntax) |
| Logic Error | Rule or pattern misspecification |
| Generation Error | LLM-specific failures: omission, distortion, fabrication |
| Other Error | Incomplete extraction, dictionary errors, normalization errors |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

---

## IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur). See [Vite Configuration Reference](https://vite.dev/config/) for build customization.
