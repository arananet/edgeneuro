# EdgeNeuro Fine-Tuning Strategy 🧠

To achieve <100ms routing with high accuracy, we do not use raw GPT-4. We fine-tune a small, efficient model (**Llama-3-8B**) on enterprise-specific routing logs.

## 1. The Data Strategy ("Geometric Separation")
As per *Sanchez-Karhunen et al. (2026)*, we must prevent "cluster collapse" by balancing our dataset.

**Target Distribution:**
- 500 examples per Intent Category.
- Hard Negatives included (e.g., "Cancel order" vs "Cancel subscription").

## 2. Dataset Format (Alpaca/JSON)
We train the model to output strict JSON.

```json
{
  "instruction": "Route the user query to the correct internal agent.",
  "input": "I can't log in to Salesforce, it says Error 403.",
  "output": "{\"target\": \"agent_it\", \"confidence\": 0.99, \"reason\": \"Login failure / Auth issue\"}"
}
```

## 3. Fine-Tuning Pipeline (LoRA)
We use **Low-Rank Adaptation (LoRA)** to train only 1-2% of parameters. This allows us to hot-swap adapters per department.

**Tools:**
- **Unsloth:** For 2x faster training on single GPU.
- **Cloudflare Workers AI:** Supports loading LoRA adapters dynamically at inference time.

## 4. Training Steps
1.  **Generate Data:** Use `scripts/generate_synthetic_training.py` to create 1000+ variations.
2.  **Train:** Run LoRA training (approx 1 hour on T4 GPU).
3.  **Convert:** Export to `.safetensors`.
4.  **Upload:** Upload adapter to Cloudflare via `wrangler ai upload`.
