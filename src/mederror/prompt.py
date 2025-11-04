"""Module for prompting LLM models for medical error classification."""

import csv
import os
from pathlib import Path
from typing import Optional

from openai import AzureOpenAI
from tqdm import tqdm
from transformers import AutoTokenizer
from vllm import LLM, SamplingParams


def prompt_llama(
    file_path: str,
    model_name: str,
    inst_text: str,
    output_file: str,
    tensor_parallel_size: int = 8,
    max_num_batched_tokens: int = 512,
    gpu_memory_utilization: float = 0.95,
    temperature: float = 0.0,
    top_p: float = 0.9,
    max_tokens: int = 1024,
) -> None:
    """
    Process medical error classification using a local Llama model.

    Args:
        file_path: Path to input CSV file with columns: ID, Sentence, NLP Prediction, Error Type
        model_name: HuggingFace model identifier
        inst_text: Instruction prompt text
        output_file: Path to output file
        tensor_parallel_size: Number of tensor parallel workers
        max_num_batched_tokens: Maximum number of batched tokens
        gpu_memory_utilization: GPU memory utilization ratio
        temperature: Sampling temperature
        top_p: Top-p sampling parameter
        max_tokens: Maximum tokens to generate
    """

    # Initialize the model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    llm = LLM(
        model=model_name,
        tensor_parallel_size=tensor_parallel_size,
        max_num_batched_tokens=max_num_batched_tokens,
        gpu_memory_utilization=gpu_memory_utilization,
    )
    sampling_params = SamplingParams(
        temperature=temperature, top_p=top_p, max_tokens=max_tokens
    )

    # Ensure output directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)

    # Open the output file in write mode
    with open(output_file, "w", encoding="utf-8") as output_f:
        # Read input from the CSV file
        try:
            with open(file_path, mode="r", encoding="utf-8-sig") as csv_file:
                csv_reader = csv.reader(csv_file)

                # Skip the header row if there is one
                next(csv_reader, None)
                # Process each row
                for row_idx, row in enumerate(tqdm(csv_reader, desc="Processing rows")):
                    try:
                        row = "".join(row).split("\t")
                        if len(row) < 4:
                            raise ValueError(
                                f"Row {row_idx + 2} has insufficient columns"
                            )
                        sentence, nlp_prediction, expected_error_type = row[1:4]
                        user_input = (
                            f"Sentence: {sentence}\tNLP Prediction: {nlp_prediction}\t"
                            f"Type of Error: {expected_error_type}"
                        )
                        messages = [
                            {"role": "system", "content": inst_text},
                            {
                                "role": "user",
                                "content": "\n\n## Input:\n\n" + user_input,
                            },
                        ]
                        prompts = tokenizer.apply_chat_template(
                            messages, add_generation_prompt=True, tokenize=False
                        )

                        result = (
                            llm.generate(prompts, sampling_params)[0]
                            .outputs[0]
                            .text.strip()
                        )

                    except Exception as e:
                        sentence = row[1] if len(row) > 1 else "N/A"
                        nlp_prediction = row[2] if len(row) > 2 else "N/A"
                        result = (
                            f"{sentence}\t{nlp_prediction}\tError\t"
                            f"Error: Unable to process - {str(e)}"
                        )

                    # Write the result to the output file
                    output_f.write(f"###### {row_idx + 1}\n{result}\n")
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file not found: {file_path}")
        except Exception as e:
            raise RuntimeError(f"Error processing file {file_path}: {str(e)}")


def prompt_openai(
    file_path: str,
    deployment_name: str,
    inst_text: str,
    output_file: str,
    client: Optional[AzureOpenAI] = None,
    api_key: Optional[str] = None,
    api_version: str = "2024-12-01-preview",
    azure_endpoint: Optional[str] = None,
) -> None:
    """
    Process medical error classification using Azure OpenAI.

    Args:
        file_path: Path to input CSV file with columns: ID, Sentence, NLP Prediction, Error Type
        deployment_name: Azure OpenAI deployment name
        inst_text: Instruction prompt text
        output_file: Path to output file
        client: Optional AzureOpenAI client instance (if None, will create from env vars)
        api_key: Optional API key (if None, uses AZURE_OPENAI_KEY env var)
        api_version: Azure OpenAI API version
        azure_endpoint: Optional endpoint (if None, uses AZURE_OPENAI_ENDPOINT env var)
    """
    # Initialize client if not provided
    if client is None:
        api_key = api_key or os.getenv("AZURE_OPENAI_KEY")
        azure_endpoint = azure_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT")

        if not api_key or not azure_endpoint:
            raise ValueError(
                "Azure OpenAI credentials not provided. Set AZURE_OPENAI_KEY and "
                "AZURE_OPENAI_ENDPOINT environment variables or pass them as arguments."
            )

        client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    # Ensure output directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)

    # Open the output file in write mode
    with open(output_file, "w", encoding="utf-8") as output_f:
        try:
            # Read input from the CSV file
            with open(file_path, mode="r", encoding="utf-8-sig") as csv_file:
                csv_reader = csv.reader(csv_file)
                # Skip the header row if there is one
                next(csv_reader, None)
                # Process each row
                for row_idx, row in enumerate(tqdm(csv_reader, desc="Processing rows")):
                    try:
                        row = "".join(row).split("\t")
                        if len(row) < 4:
                            raise ValueError(
                                f"Row {row_idx + 2} has insufficient columns"
                            )
                        sentence, nlp_prediction, expected_error_type = row[1:4]
                        user_input = (
                            f"Sentence: {sentence}\tNLP Prediction: {nlp_prediction}\t"
                            f"Type of Error: {expected_error_type}"
                        )

                        # O1 model uses different prompt format
                        if "o1" not in deployment_name.lower():
                            response = client.chat.completions.create(
                                model=deployment_name,
                                messages=[
                                    {"role": "system", "content": inst_text},
                                    {
                                        "role": "user",
                                        "content": "\n\n## Input:\n\n" + user_input,
                                    },
                                ],
                            )
                        else:
                            response = client.chat.completions.create(
                                model=deployment_name,
                                messages=[
                                    {
                                        "role": "user",
                                        "content": inst_text
                                        + "\n\n## Input:\n\n"
                                        + user_input,
                                    },
                                ],
                            )

                        result = response.choices[0].message.content.strip()
                    except Exception as e:
                        sentence = row[1] if len(row) > 1 else "N/A"
                        nlp_prediction = row[2] if len(row) > 2 else "N/A"
                        result = (
                            f"{sentence}\t{nlp_prediction}\tError\t"
                            f"Error: Unable to process - {str(e)}"
                        )

                    # Write the result to the output file
                    output_f.write(f"###### {row_idx + 1}\n{result}\n")
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file not found: {file_path}")
        except Exception as e:
            raise RuntimeError(f"Error processing file {file_path}: {str(e)}")


# Define the system prompt (inst_text) separately as given
inst_text = """
## Background 

You are an expert in clinical information extraction. Your task is to perform error analysis, defined as a process used to document errors that appear after an NLP model run.

## Task Definition 

The objective for this IE task is to extract delirium or fall associated mentions from unstructured clinical notes. Clinical concepts are defined as Altered mental status, Confusion, Disconnected, Disorganized Thinking, Disorientation, Fall, Hallucination, Delirium, Delirium, Encephalopathy, Agitation, Fluctuation, Inattention, Reorientation, Indeterminant, Drowsy.

The task is to analyze the given input sentence or text phrase and NLP prediction result to identify the error classes of the NLP predictions, defined as Guideline_Error, Absence_of_Context, Certainty, Differential_Diagnosis, Hypothetical_Language, Medical_Grading, Negation, Possible_and_Probable_Language, Exclusion, Medical_Evaluation, Medical_Instruction, Medical_Risk, Patient_Education, Section, Temporal_Status, History, Present, Subject, Family_Member, Other_Subject, Morphological_Error, Orthographic_Error, Spelling_Error, Abbreviation_Error, Semantic_Error, Homonyms, Implied_Inference, Statistical_Inference, Synonym, Syntactic_Error, Sentence_Boundaries, Typographical_Error, Logic_Pattern_and_Rule, Incomplete_Extraction, Dictionary_Error, Normalization_Error, Medical_Question, Risk_Assessment.

Here is the detailed definition and examples: 

Annotation error: Human error occurred during corpus annotation, which is a process involving the manual review, judgment, marking, and labeling of linguistic and clinical concepts from unstructured text. 

Example (delirium):  

Confusion/Disorientation Hendrich:   Yes 

Best Verbal Response Glasgow:   Confused 

Annotation guideline: errors occur due to conflicts between NLP definition and annotation guideline definition. E.g., the version of guideline does not align with NLP version. 

Example (delirium): 

Guideline definition: encephalopathy = delirium positive 

NLP definition: encephalopathy = CAM_D 

Example (delirium): 

Screening for delirium = delirium (positive) 

*Incorrect, screening for delirium should mark as delirium (exclusion) 

 

Contextual error: information found in the context of the condition that modifies individual clinical conditions. 

Absence of context:	NLP model falsely or partially captures concepts due to lack of enough context to determine the certainty, status and subject of the expression 

Example (delirium): 

‘Confusion’ (occurs as a single concept without context)  

Correction:  

Patient has a constant confused look displayed on his/her face. 

Certainty: NLP model falsely captures concepts due to incorrectly judging grade (within the power or capacity of someone or something), possible, probable-related terms or expressions  

Differential diagnosis: description that document a process where clinicians consider various possible conditions or diseases that could explain a patient's symptoms before making a final diagnosis. 

Example (SBI): 

One potential differential diagnosis for silent infarction could include other causes of neurological symptoms such as migraine with aura, transient ischemic attack (TIA), or small fiber neuropathy 

Hypothetical language: hypothesis-related concepts or expressions. 

Example (delirium): 

Patient would have delirium if the CAM screening test come out positive 

Medical Grading: A model incorrectly classifies concepts due to an erroneous assessment of grade, which pertains to the ability or capacity of someone or something. 

Example (WMD): 

Moderate scattered deep and subcortical punctate white matter 

Abnormal low- density in the right parietal periventricular white matter 

Negation: NLP model falsely captures concepts due to incorrectly judging negation-related (contradiction or denial of something) terms or expressions. 

Example (delirium): 

Not able to be easily aroused 

Patient does not have encephalopathy. 

No history of confusion 

Possible and probable language: NLP model falsely captures concepts due to incorrectly possible, probable-related terms or expressions. 

Example (WMD): 

Likely/probable focus of nonspecific white matter disease  

Possibility of demyelinating disease 

Exclusion: NLP model falsely captures concepts due to the concepts occur in a wrong context 

Medical evaluation: A description of a patient presenting to a clinic for evaluation and assessment of their condition. The concepts need to be excluded because they do not reflect patient’s disease status 

Example (delirium): 

I was called to evaluate the patient for an episode of confusion 

Patient was screened for confusion 

Medical instruction: communication of medical information, advice, and instructions to individuals seeking healthcare or treatment. 

Example (delirium): 

When to Call Your Doctor Call your doctor right away if you have any of the following: Confusion or forgetfullness Muscle spasms, cramping, or twitching Seizures Gait disturbances 

Medical risk: communication about the likelihood and severity of harm or negative consequences that can result from medical decisions or actions. 

Example (fall): 

High risk for falls 

I am worried about falling. 

Patient education: clinical language about providing patients with information, knowledge, and resources to help them understand their medical conditions, treatment options, and self-care practices. 

Example (fall, delirium): 

Fall prevention education 

The nurse disconnected the call 

Section: (structure of clinical document e.g., Clinical Document Architecture HL7 standard): section errors occur when NLP models falsely captures the pre-defined concepts that belongs to wrong section. 

Example (delirium): 

Family History (Section ID) 

Hypertension: Yes 

Diabetes: Yes 

*Family information sometimes is considered as exclusion. Fail to consider the section information can result in misclassification. 

Temporal Status: temporal status refer to the current condition or state of a patient's medical or health-related information. It is used to distinguish between historical information (past status) and information that reflects the patient's current state (present status). 

History 

Example (delirium): 

Patient has history of hallucinations (past) 

Patient described episodes of delirium several years ago (past) 

His hallucinations were resolved (past) 

Present 

Example (delirium): 

Patient experienced episode of confusion this morning (current) 

Currently CAM Positive (current) 

She has experienced confusion several times during the last few days (current/past) 

Subject: an individual or entity that is the focus of attention or observation to be identified within a specific clinical context. Most common scenario is to refer to an individual who is receiving medical treatment. 

Family member: family member can be subjects of the study when their medical history, genetic information, or other factors are relevant to the research or medical care of the patient. The description can be commonly found in the family history section of clinical notes. 

Example (delirium): 

Patient’s grandpa has hypertension and diabetes (FP) 

Daughter/Son called and states patient has continued to be confused (TP) 

Other subject: the target subject can also be non-human, such as disease symptoms.  

Example (delirium): 

The character of symptoms is agitated. 

The course/duration of symptoms is fluctuating in intensity. 

The vision he says has been very blurry and it fluctuates. 


Linguistic error: linguistic errors refer to inaccuracies or inconsistencies in the representation of clinical expressions, including issues related to morphology, orthography, semantics, and syntax. These errors can lead to misclassification and occur more frequently in false negative expressions 

Morphological error: morphologic errors occur when NLP models fails to capture the pre-defined concepts due to the variation in structure and formation of words (prefixes, suffixes and base words) 

Example (delirium): 

Hallucinates; Hallucination;  

Altered; Alteration; Alter 

Orthographic error: orthographic errors occur when NLP models fail to capture the pre-defined concepts due to the variation in language conventions including special characters, spelling, hyphenation, capitalization, word breaks, emphasis, and punctuation. 

Spelling error: a spelling error occurs when a deviation from the standard or intended spelling convention of the language led to misclassification for the model.  

Example (delirium; fall): 

Decresed (Decreased) responsiveness  

agitated (agitated) 

ell (Fell) last night  

Abbreviation error: an abbreviation error occurs when the model misinterprets or fails to recognize abbreviated forms of words or phrases. 

Example: 

COPD - Chronic Obstructive Pulmonary Disease 

UTI - Urinary Tract Infection 

GERD - Gastroesophageal Reflux Disease 

DM - Diabetes Mellitus 

Semantic error: a semantic error occurs when the meaning or interpretation of a clinical text is misunderstood by model or annotator. Common semantic error types include homonyms, implied inference, statistical inference, and synonym.  

Homonyms: words that are spelled and pronounced the same but have different meanings. 

Example (fall): 

Fall asleep 

Redwood falls 

Water falls 

Implied inference: missing paraphrase and implication. 

Example (fall): 

landing flat on his back 

missed the last step while going down the stairs 

patient went down with a sudden knee flexion 

Example (delirium): 

Becoming more forgetful 

Difficulty with his/her speech particularly with word finding 

*Concepts or expressions that can directly/indirectly infer the target concept of interest 

Statistical inference: inability of make proper statistic inference. Common examples include rare expression although occurs in training data, the model still unable to fully capture all possible cases. 

Example (fall): 

Common expression: patient fell.  

Rare expression: when he went down, his hands were behind him. 

Synonym: missing new lexicon and synonym not in the original NLP ruleset 

Example (delirium): 

Disorganized thinking: fuzziness; obtunded; forgetful 

Difficulty concentrating: inattention 

Disconnected: obtunded; fatigue; somnolence 

Syntactic error: a syntactic error occurs when violating the grammatical structure or rules of the language especially when the system fails to parse or understand the grammatical structure of sentences or phrases correctly. 

Sentence boundaries: sentence boundary detection is a task of segmenting individual sentences within a block of clinical text. Imperfect sentence boundaries, due to the lack of punctuation, can cause errors for sentence-level classifiers or extractors. 

Example (fall): 

Patient did not have dementia; but had several syncope events.  

Typographical error: typographical errors occur when NLP models fails to capture the pre-defined concepts due to the variation in the physical representation and appearance of text. Common typographical representations include inserting, deleting, replacing, and transposing the original word form and format. 

Example: 

Randcom (insert) 

Randm (delete) 

Randcm (replace) 

Randmo (transpose) 

 

Logic error: logic errors occur when NLP model falsely make classification or summarization due to logic or rule patterns.  

Logic pattern rule: logic errors occur when NLP model falsely make classification or summarization due to logic or rule patterns. 

Example (SBI, delirium):  

Silent cerebrovascular disease = positive mention of brain infarction  

Correction: positive mention of brain infarction without prior history of stroke 

CAM Delirium positive = CAM_BCD 

Correction: CAM Delirium positive = CAM_ABCD or CAM_ABC or CAM_ABD 

 

Other error 

Incomplete extraction: the NLP model can only partially identify a concept, which cannot provide a complete picture for ascertaining a patient's status. 

Example (WMD): 

Model only correctly captured disease and failed to identify grading: Punctate foci (grading) deep white matter (disease) lesion found. 

Dictionary error: an error made by a middleware dictionary or knowledge base such Unified Medical Language System (UMLS) and MeSH (Medical Subject Headings) 

Example: 

UMLS synonymy error 

UMLS absence error 

Normalization error: An error occurred while mapping medical mentions to standardized ontologies like UMLS or controlled vocabularies like SNOMED CT. 

Example: 

In UMLS, some medications' descriptions contain strength information, including "cyanocobalamin 1000 MCG Oral Tablet" (CUI: C0976004), "cyanocobalamin 1000 MCG Oral Capsule" (CUI: C0786262), etc. Based on the example: "2. Cyanocobalamin 1000 mcg/mL Solution Sig: One (1) Injection DAILY (Daily) for 3 days," the system matched "Cyanocobalamin 1000" to CUI-C0976004 as a medication and ignored "1000 mcg/ml" as a strength. 


## Instructions 

1. Carefully read the input sentence, NLP prediction, and the type of error (fp: false posive or fn: false negative) of the NLP prediction.
2. Assign the correct error class to the given input. Error classes: Guideline_Error, Absence_of_Context, Certainty, Differential_Diagnosis, Hypothetical_Language, Medical_Grading, Negation, Possible_and_Probable_Language, Exclusion, Medical_Evaluation, Medical_Instruction, Medical_Risk, Patient_Education, Section, Temporal_Status, History, Present, Subject, Family_Member, Other_Subject, Morphological_Error, Orthographic_Error, Spelling_Error, Abbreviation_Error, Semantic_Error, Homonyms, Implied_Inference, Statistical_Inference, Synonym, Syntactic_Error, Sentence_Boundaries, Typographical_Error, Logic_Pattern_and_Rule, Incomplete_Extraction, Dictionary_Error, Normalization_Error, Medical_Question, Risk_Assessment.  
3. Be as detailed and verbose as possible in your reasoning.

## Reasoning 

Provide your step-by-step reasoning here. Discuss the error assigned to each sentence and NLP prediction input, including any relevant context or considerations.

## Input Format 

Sentence\tNLP prediction\ttype of error

## Output Format 

Generate the Error class and Reasoning in the following format.

**Final Answer**:
Error class:
Reasoning:
"""


def get_default_prompt() -> str:
    """
    Get the default instruction prompt for medical error classification.

    Returns:
        The default instruction prompt text
    """
    return inst_text


if __name__ == "__main__":
    # Example usage: OpenAI
    # Uncomment and configure to use Azure OpenAI
    """
    os.environ["AZURE_OPENAI_KEY"] = ""
    os.environ["AZURE_OPENAI_ENDPOINT"] = ""

    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        api_version="2024-12-01-preview",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    )

    # deployment_name = 'gpt-4o'
    # deployment_name = 'o3-mini'
    deployment_name = "o1"

    file_path = "error_input_v3.csv"
    output_path = "output3/" + deployment_name

    prompt_openai(file_path, deployment_name, inst_text, output_path)
    """

    # Example usage: Local Llama models
    # Uncomment and configure to use local Llama models
    # model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    # model_id = "meta-llama/Meta-Llama-3.1-70B-Instruct"
    model_id = "meta-llama/Meta-Llama-3.1-405B-Instruct-FP8"

    # file_path = 'error_input_v2.csv'
    file_path = "error_input_v3.csv"

    # output_path = 'output/' + model_id.split('/')[1].strip()
    output_path = "output3/" + model_id.split("/")[1].strip()

    prompt_llama(file_path, model_id, inst_text, output_path)
