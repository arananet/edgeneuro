# Fine-Tuning Tutorial 🧠

This guide covers training a Small Language Model (SLM) for intent detection.

## Why Fine-Tune?

A generic LLM (like GPT-4) is expensive and slow for simple routing decisions. Fine-tuned SLMs (like Llama-3-8B) can achieve:
- **<50ms latency** (vs 500ms+ for GPT-4)
- **$0.0001 per request** (vs $0.01)
- **Domain-specific accuracy** (learns your company's intents)

## Step 1: Generate Synthetic Training Data

We've provided a script to generate training data:

```bash
cd edgeneuro
python3 scripts/generate_synthetic_training.py
```

This creates `edgeneuro_training_data.jsonl` with examples like:
```json
{"instruction": "Route the user query...", "input": "I need help with vacation request", "output": "{\"target\": \"agent_hr\", \"confidence\": 1.0}"}
```

## Step 2: Expand with Real Data (Recommended)

The synthetic data is a starting point. For production:

1. **Collect real queries** from your users over 2-4 weeks
2. **Label them** with the correct agent target
3. **Add variations** using an LLM:
```python
from openai import OpenAI
client = OpenAI()

def expand_query(original):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{
            "role": "user", 
            "content": f"Generate 10 variations of this user query in different writing styles: {original}"
        }]
    ])
    return response.choices[0].message.content.split('\n')
```

## Step 3: Fine-Tune with LoRA

We use **Unsloth** for memory-efficient training:

```bash
# Install Unsloth
pip install unsloth

# Run training
python3 << 'EOF'
from unsloth import FastLanguageModel
import json

max_seq_length = 512
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/llama-3-8b-bnb-4bit",
    max_seq_length = max_seq_length,
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
)

# Load data
with open("edgeneuro_training_data.jsonl") as f:
    data = [json.loads(line) for line in f]

# Format for training (Alpaca style)
train_data = []
for item in data:
    text = f"""Instruction: {item['instruction']}
Input: {item['input']}
Output: {item['output']}"""
    train_data.append({"text": text})

# Train (adjust epochs for your dataset size)
from transformers import Trainer, TrainingArguments
trainer = Trainer(
    model=model,
    train_dataset=train_data,
    args=TrainingArguments(
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=True,
        logging_steps=1,
        output_dir="outputs",
    ),
)
trainer.train()

# Save adapter
model.save_pretrained("edgeneuro-lora")
tokenizer.save_pretrained("edgeneuro-lora")
EOF
```

## Step 4: Export and Upload

```bash
# Convert to safetensors
python -c "from unsloth import FastLanguageModel; model, tokenizer = FastLanguageModel.from_pretrained('edgeneuro-lora', device_map='auto'); model.save_pretrained_merged('edgeneuro-adapter', tokenizer)"

# Upload to Cloudflare (requires Wrangler)
npx wrangler ai upload edgeneuro-adapter
```

## Step 5: Use in SynapseCore

Update `synapse_core/src/index.ts` to use your fine-tuned model:

```typescript
// Replace @cf/meta/llama-3-8b-instruct with your uploaded model
const response = await ai.run('@cf/your-org/edgeneuro-router', {
  messages: [...]
});
```

## Next Steps

- [Configuration Guide](./03-configuration.md)
- [Testing & Evaluation](./04-testing-evaluation.md)
