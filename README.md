# MedError

A project for medical error detection and analysis

## 🌐 Try the App

https://ohnlp.org/MedError/

---

## System Requirements

### Operating Systems

This software has been tested on:

- **macOS** (Darwin 24.2.0 and later)
- **Linux** (Ubuntu 20.04, 22.04)
- **Windows** (Windows 10/11 with WSL2 recommended)

## 📊 Sample Data

Sample data files are available in the `assets/` folder:

- `error_definition.yaml` - Error category definitions
- `error_labels.json` - Annotated medical text examples

---

## Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/OHNLP/MedError.git
cd MedError
```

### Step 2: Create a Virtual Environment

```bash
conda env create -f environment.yml
conda activate mederror
```

### Step 3: Install Dependencies

```bash
pip install -e .
```

For development dependencies:

```bash
pip install -e .[dev]
```

### Typical Install Time

- **With Conda**: ~5 minutes

---

## Demo

** Edit path in the code to run the demo**

1. **Run error classification**:

   ```bash
   python src/mederror/prompt.py
   ```

2. **Post-process results**:

   ```bash
   python src/mederror/postprocess.py
   ```

3. **Evaluate results**:
   ```bash
   python src/mederror/eval.py
   ```

## Contribution Guidelines

If you plan to contribute to this repository, follow these steps:

1. Fork the repository and create a new branch for your changes:

```bash
git checkout -b your-branch-name
```

2. Install development dependencies:

```bash
pip install .[dev]
```

3. Set up pre-commit hooks:

```bash
pre-commit install
```

4. Commit your changes and open pull request with a clear description of changes.
