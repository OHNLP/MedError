"""Module for parsing and postprocessing LLM output files."""

import csv
import re
from pathlib import Path
from typing import Optional

import pandas as pd


def parse_result_file(file_path: str) -> Optional[pd.DataFrame]:
    """
    Parse result file with markdown table format.

    Args:
        file_path: Path to the result file

    Returns:
        DataFrame with columns: Sentence, NLP Prediction, Error Class, Reasoning
        Returns None if no tables found
    """
    if not Path(file_path).exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # List to hold all data rows from each query's table
    all_rows = []

    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    # Split the file by queries using regex to identify each query's starting line
    queries = re.split(r"(###### \d+)", content.strip())
    idx = 0
    for i in range(1, len(queries), 2):
        query_content = queries[i + 1].strip()

        # Extract only tables with exactly 4 columns
        table_match = re.search(
            r"((\|?[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|?)\n(\|?[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|?\n?)*)",
            query_content,
        )

        if table_match:
            # Split rows and get only the data row, skipping the header and dashed line
            table_lines = table_match.group(0).strip().split("\n")
            idx += 1
            if len(table_lines) > 2:
                data_row = table_lines[2]
                row_data = [col.strip() for col in data_row.split("|") if col.strip()]
            elif len(table_lines) > 1:
                data_row = table_lines[1]
                row_data = [col.strip() for col in data_row.split("|") if col.strip()]
            else:
                rows = re.findall(r"\\text{([^}]*)}", query_content)
                row_data = [
                    rows[i : i + 4] for i in range(4, len(rows), 4)
                ]  # Skip header row

            all_rows.append(row_data)

        else:
            # print(query_content)
            idx += 1
            print(idx)
            all_rows.append(
                [
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                ]
            )

    # Define headers based on expected columns
    headers = ["Sentence", "NLP Prediction", "Error Class", "Reasoning"]

    # Convert collected data rows into a DataFrame
    if all_rows:
        df = pd.DataFrame(all_rows, columns=headers)
        return df
    else:
        print("No tables found in the file.")
        return None


def parse_result_file_tab(file_path: str) -> Optional[pd.DataFrame]:
    # List to hold parsed data rows from each query
    all_rows = []

    with open(file_path, "r") as file:
        content = file.read()

    # Split by queries using regex to identify each section starting with "######"
    queries = re.split(r"(###### \d+)", content.strip())

    for i in range(1, len(queries), 2):
        # Each section starts with '######' identifier and contains the reasoning and final answer.
        query_content = queries[i + 1].strip()

        # First, try to find "**Final Answer**:" format
        final_answer_match = re.search(
            r"\*\*Final Answer\*\*:\n(.+)", query_content, re.DOTALL
        )

        # If "**Final Answer**:" is not found, try alternative formats "### Final Answer:" or "## Final Answer:"
        if not final_answer_match:
            final_answer_match = re.search(
                r"(#{2,3}\s*Final Answer:)\n(.+)", query_content, re.DOTALL
            )
            if final_answer_match:
                final_answer = final_answer_match.group(2).strip()
            else:
                # If no valid final answer is found, add failure case
                all_rows.append(
                    [
                        "CHATGPT_FAILURE",
                        "CHATGPT_FAILURE",
                        "CHATGPT_FAILURE",
                        "CHATGPT_FAILURE",
                    ]
                )
                continue
        else:
            final_answer = final_answer_match.group(1).strip()

        # Parse the final answer content, splitting by tabs
        row_data = [col.strip() for col in final_answer.split("\t") if col.strip()]

        # Ensure row_data has exactly 4 columns for the DataFrame
        if len(row_data) == 4:
            all_rows.append(row_data)
        else:
            # Append failure state if parsing doesn't yield the expected columns
            all_rows.append(
                [
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                ]
            )

    # Define headers based on expected columns
    headers = ["Sentence", "NLP Prediction", "Error Class", "Reasoning"]

    # Convert collected data rows into a DataFrame
    if all_rows:
        df = pd.DataFrame(all_rows, columns=headers)
        return df
    else:
        print("No valid final answers found in the file.")
        return None


def parse_result_file_new(
    file_path: str, original_input: str
) -> Optional[pd.DataFrame]:
    """
    Parse result file with new format and merge with original input data.

    Args:
        file_path: Path to the result file
        original_input: Path to original input CSV file

    Returns:
        DataFrame with columns: Sentence, NLP Prediction, Error Class, Reasoning,
        ID, sent, Concept Norm, error_type
        Returns None if no valid final answers found
    """
    if not Path(file_path).exists():
        raise FileNotFoundError(f"Result file not found: {file_path}")
    if not Path(original_input).exists():
        raise FileNotFoundError(f"Original input file not found: {original_input}")

    # List to hold parsed data rows from each query
    all_rows = []

    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    with open(original_input, mode="r", encoding="utf-8-sig") as csv_file:
        csv_reader = csv.reader(csv_file)
        next(csv_reader, None)  # Skip header
        csv_rows = list(csv_reader)

    # Split by queries using regex to identify each section starting with "######"
    queries = re.split(r"(###### \d+)", content.strip())
    idx = 0
    for i in range(1, len(queries), 2):
        # Each section starts with '######' identifier and contains the final answer details.
        query_content = queries[i + 1].strip()
        query_content = re.sub(
            r"(?i)^.*?final answer", "Final Answer", query_content, flags=re.S
        )

        # First, try to find "**Final Answer**:" block
        # (Pattern matching is done below in the if statement)

        if (
            "error class" in query_content.lower()
            and "reasoning" in query_content.lower()
        ):
            # print(query_content)
            query_content = query_content.replace("*", "")
            error_class_match = re.search(
                r"error class:\s*", query_content, re.IGNORECASE
            )
            reasoning_match = re.search(
                r"\s*reasoning:\s*", query_content, re.IGNORECASE
            )

            if not error_class_match or not reasoning_match:
                # Handle missing "Final Answer" section gracefully
                row_ori = "".join(csv_rows[idx]).split("\t")
                row_data = [
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                    "CHATGPT_FAILURE",
                ] + row_ori
                all_rows.append(row_data)
                idx += 1
                continue

            error_class_start = error_class_match.end()
            reasoning_start = reasoning_match.start()
            reasoning_end = reasoning_match.end()

            # Extract the "Error class" text up to "Reasoning" and "Reasoning" text up to the end
            error_class = query_content[error_class_start:reasoning_start].strip()
            reasoning = query_content[reasoning_end:].strip()

            sentence = "N/A"  # Placeholder; adapt as needed if more information on Sentence is available
            nlp_prediction = "N/A"  # Placeholder

            # Append row to all_rows with the extracted data
            row_ori = "".join(csv_rows[idx]).split("\t")
            row_data = [sentence, nlp_prediction, error_class, reasoning] + row_ori
            all_rows.append(row_data)
            idx += 1
        else:
            # Handle missing "Final Answer" section gracefully
            row_ori = "".join(csv_rows[idx]).split("\t")
            row_data = [
                "CHATGPT_FAILURE",
                "CHATGPT_FAILURE",
                "CHATGPT_FAILURE",
                "CHATGPT_FAILURE",
            ] + row_ori
            # print(len(row_data))
            all_rows.append(row_data)
            idx += 1

    # Define headers based on expected columns
    headers = [
        "Sentence",
        "NLP Prediction",
        "Error Class",
        "Reasoning",
        "ID",
        "sent",
        "Concept Norm",
        "error_type",
    ]
    # Convert collected data rows into a DataFrame
    if all_rows:
        df = pd.DataFrame(all_rows, columns=headers)
        return df
    else:
        print("No valid final answers found in the file.")
        return None


if __name__ == "__main__":
    # Example usage
    original_input = "error_input_v3.csv"
    file_path = "output3/o1"

    df = parse_result_file_new(file_path, original_input)
    print(df)
    df.to_csv(file_path + "_clean.csv", index=True)
