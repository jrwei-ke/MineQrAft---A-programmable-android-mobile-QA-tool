# Process Backend

## Purpose

This backend is for executable the block function according to the script.

## Quick Start

1. conda activate mqa
2. python api.py

## Structure

- `templates/` is an file where templates stored in.
- `api.py` is an backend for processing block function. A new process function should be added here.
- `ocr.py` is paddle ocr tool.
- `template_match.py` is cv template match tool.

## ToDo
- real-time screen shot which may cause a synchronize issue.
- database management
- monitor supervising
