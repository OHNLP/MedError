"""Module for evaluating medical error classification results."""

from pathlib import Path
from typing import Dict

import pandas as pd
from sklearn.metrics import accuracy_score, precision_recall_fscore_support


def evaluate_predictions(
    result_file: str,
    gold_file: str,
    result_column: str = "Error Class",
    gold_column: str = "Human_Label",
    delimiter: str = "\t",
    case_sensitive: bool = False,
) -> Dict[str, float]:
    """
    Evaluate classification predictions against gold standard labels.

    Args:
        result_file: Path to CSV file with predictions
        gold_file: Path to TSV file with gold standard labels
        result_column: Name of the column containing predictions
        gold_column: Name of the column containing gold labels
        delimiter: Delimiter for gold file (default: tab)
        case_sensitive: Whether to perform case-sensitive comparison

    Returns:
        Dictionary with metrics: accuracy, precision, recall, f1

    Raises:
        FileNotFoundError: If input files don't exist
        ValueError: If files have different numbers of rows or missing columns
    """
    # Check if files exist
    if not Path(result_file).exists():
        raise FileNotFoundError(f"Result file not found: {result_file}")
    if not Path(gold_file).exists():
        raise FileNotFoundError(f"Gold file not found: {gold_file}")

    # Load the CSV files
    result_df = pd.read_csv(result_file)
    gold_df = pd.read_csv(gold_file, delimiter=delimiter)

    # Check required columns
    if result_column not in result_df.columns:
        raise ValueError(
            f"Column '{result_column}' not found in result file. "
            f"Available columns: {list(result_df.columns)}"
        )
    if gold_column not in gold_df.columns:
        raise ValueError(
            f"Column '{gold_column}' not found in gold file. "
            f"Available columns: {list(gold_df.columns)}"
        )

    # Ensure both dataframes have the same length
    if len(result_df) != len(gold_df):
        raise ValueError(
            f"Files have different numbers of rows: "
            f"result={len(result_df)}, gold={len(gold_df)}"
        )

    # Convert the columns to lowercase for case-insensitive comparison
    if case_sensitive:
        result_labels = result_df[result_column].astype(str)
        gold_labels = gold_df[gold_column].astype(str)
    else:
        result_labels = result_df[result_column].astype(str).str.lower()
        gold_labels = gold_df[gold_column].astype(str).str.lower()

    # Calculate accuracy
    accuracy = accuracy_score(gold_labels, result_labels)

    # Calculate precision, recall, and F1-score
    precision, recall, f1, _ = precision_recall_fscore_support(
        gold_labels, result_labels, average="weighted", zero_division=0
    )

    metrics = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }

    return metrics


def print_metrics(metrics: Dict[str, float]) -> None:
    """
    Print evaluation metrics in a formatted way.

    Args:
        metrics: Dictionary with metrics from evaluate_predictions
    """
    print("Evaluation Metrics:")
    print(f"Accuracy:  {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall:    {metrics['recall']:.4f}")
    print(f"F1 Score:  {metrics['f1']:.4f}")


if __name__ == "__main__":
    # Example usage
    result_file = "output3/o1_clean.csv"
    gold_file = "error_gold_v3.csv"

    metrics = evaluate_predictions(result_file, gold_file)
    print_metrics(metrics)
