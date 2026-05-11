"""MedError: Medical error detection and analysis package."""

from mederror.eval import evaluate_predictions, print_metrics
from mederror.postprocess import (
    parse_result_file,
    parse_result_file_new,
    parse_result_file_tab,
)
from mederror.prompt import get_default_prompt, prompt_llama, prompt_openai

__all__ = [
    "evaluate_predictions",
    "print_metrics",
    "parse_result_file",
    "parse_result_file_new",
    "parse_result_file_tab",
    "get_default_prompt",
    "prompt_llama",
    "prompt_openai",
]

__version__ = "0.0.1"
