# Fine-Tuning Analysis for EdgeNeuro

## Use Case: Intent Classification / Routing

The router needs to classify user queries and route to the correct agent. This is a **classification task**, not general conversation.

---

## Current Architecture

```
User Query → SynapseCore → Workers AI (Llama 3.2 1B) → Decision → Agent
```

**Current approach:**
- Base Llama 3.2 1B model
- System prompt with agent definitions
- Keyword matching fallback

---

## Fine-Tuning Options on Cloudflare

### Option 1: LoRA Adapters (Recommended)

Cloudflare supports **LoRA fine-tuning** for:
- `@cf/meta/llama-3.2-1b-instruct` ✅
- `@cf/meta/llama-3.2-3b-instruct` ✅
- `@cf/mistral/mistral-7b-instruct-v0.2-lora`
- `@cf/google/gemma-2-27b-it-lora`

**Pros:**
- Lightweight (MB vs GB)
- Fast to train
- No base model changes
- Easy to switch between adapters

**Cons:**
- Requires training outside Cloudflare first
- Upload adapter files (.safetensors + config)

---

## What's Needed for Fine-Tuning

### 1. Training Data

```json
[
  {
    "query": "I need to request vacation days",
    "intent": "hr_vacation",
    "agent": "agent_hr"
  },
  {
    "query": "My VPN is not connecting",
    "intent": "it_vpn",
    "agent": "agent_it"
  },
  {
    "query": "How many sick days do I have?",
    "intent": "hr_benefits",
    "agent": "agent_hr"
  },
  {
    "query": "Can't login to my laptop",
    "intent": "it_login",
    "agent": "agent_it"
  }
]
```

**Recommended dataset size:** 50-200 examples per intent

### 2. Training Infrastructure

Since Cloudflare doesn't provide training, use:
- **HuggingFace Autotrain** (free tier)
- **LoRA training scripts** (local or cloud GPU)
- **Modal** or **RunPod** for quick fine-tuning

### 3. Model Compatibility

For Cloudflare LoRA, base model must:
- Not be quantized (no AWQ/GGUF)
- Support LoRA (listed above)

**Recommended base:** `@cf/meta/llama-3.2-1b-instruct`

---

## Step-by-Step Plan

### Phase 1: Data Collection
1. Gather real query examples from users
2. Label with correct agent/intent
3. Add variations (typos, synonyms)

### Phase 2: Training
```bash
# Option A: HuggingFace Autotrain
# 1. Upload dataset to HuggingFace
# 2. Use Autotrain with Llama 3.2 1B
# 3. Download LoRA adapter

# Option B: Local training
# 1. Use peft/trl libraries
# 2. Train LoRA adapter
# 3. Export adapter files
```

### Phase 3: Upload to Cloudflare
```bash
wrangler ai finetune create @cf/meta/llama-3.2-1b-instruct intent-routing ./adapter/

wrangler ai finetune list
```

### Phase 4: Use in SynapseCore
```typescript
// In index.ts
const response = await env.AI.run(
  "@cf/meta/llama-3.2-1b-instruct",
  { messages: [...] },
  { lora: "your-finetune-id" }
);
```

---

## Alternative: Better Prompt Engineering

Before fine-tuning, optimize the system prompt:

```typescript
const SYSTEM_PROMPT = `You are an intent classifier for EdgeNeuro.
Your task is to classify user queries into one of these categories:

AGENTS:
- agent_hr: vacation, PTO, benefits, sick leave, salary, employee policies
- agent_it: VPN, password, login, hardware, software, wifi, email
- agent_fallback: anything else

RULES:
1. Match to most specific intent
2. Consider synonyms and variations
3. If unsure, use agent_fallback

Output JSON: {"target": "agent_id", "confidence": 0.0-1.0, "reason": "..."}`;
```

---

## Recommendation

1. **Start with prompt optimization** - often 80% as effective as fine-tuning
2. **Collect 100+ examples** per intent
3. **Fine-tune only if**:
   - Accuracy < 90% with base model
   - Need faster inference (smaller prompt = faster)
   - Specific terminology not in base model

The 1B model with good prompts should handle intent routing well for most cases. Fine-tuning is an optimization, not a requirement.
