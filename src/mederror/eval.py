import pandas as pd
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

# Load the CSV files

result_df = pd.read_csv("output3/o1_clean.csv")

gold_df = pd.read_csv("error_gold_v3.csv", delimiter="\t")
# Ensure both dataframes have the same length
assert len(result_df) == len(gold_df), "The files have different numbers of rows."

# Convert the columns to lowercase for case-insensitive comparison
result_labels = result_df["Error Class"].astype(str).str.lower()
gold_labels = gold_df["Human_Label"].astype(str).str.lower()

# Calculate accuracy
accuracy = accuracy_score(gold_labels, result_labels)

# Calculate precision, recall, and F1-score
precision, recall, f1, _ = precision_recall_fscore_support(
    gold_labels, result_labels, average="weighted"
)

# Display metrics
print("Evaluation Metrics:")
print(f"Accuracy: {accuracy:.2f}")
print(f"Precision: {precision:.2f}")
print(f"Recall: {recall:.2f}")
print(f"F1 Score: {f1:.2f}")
print(accuracy, precision, recall, f1)
