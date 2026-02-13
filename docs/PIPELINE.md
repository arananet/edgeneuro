# Training & Inference Pipeline

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EdgeNeuro Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌───────────────┐    ┌────────────────┐  │
│  │   Control    │───▶│  SynapseCore  │───▶│  AI Gateway    │  │
│  │   Plane      │    │  (Router)    │    │  (Cloudflare)  │  │
│  │              │    │               │    │                │  │
│  │ - Model      │    │ - Route      │    │ - Cache        │  │
│  │   Selection  │    │ - LLM Call   │    │ - Fallback     │  │
│  │ - Fine-tune  │    │ - Agents     │    │ - Analytics    │  │
│  │   Upload     │    │               │    │ - Rate Limit  │  │
│  └──────────────┘    └───────────────┘    └────────────────┘  │
│         │                    │                     │            │
│         ▼                    ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    D1 Database                            │  │
│  │  - Agents         - Users         - Config               │  │
│  │  - LoRAs         - Logs           - Providers            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Training Pipeline

### 1. Collect Data
- User queries logged to D1
- Manual labeling in Controlplane
- Export to JSONL

### 2. Fine-Tune (External)
```bash
# Option A: HuggingFace Autotrain
# 1. Upload dataset to HuggingFace
# 2. Configure Autotrain with Llama 3.2 1B
# 3. Download LoRA adapter

# Option B: Local training
python train_lora.py --base-model llama-3.2-1b --data train.jsonl
```

### 3. Upload to Cloudflare
```bash
wrangler ai finetune create @cf/meta/llama-3.2-1b-instruct intent-routing ./adapter/
```

### 4. Register in Controlplane
- Add LoRA ID to config
- Set as active model

---

## Inference Pipeline

### 1. Request Flow
```
User Query → Controlplane → SynapseCore → AI Gateway → Workers AI
                                       ↓
                                  D1 (cache/logs)
```

### 2. AI Gateway Features
- **Caching**: Cache frequent queries
- **Fallback**: Switch models on error
- **Rate Limiting**: Prevent abuse
- **Analytics**: Track usage/cost

### 3. Model Selection
Configure in `wrangler.toml` or via API:
```toml
[runtime_vars]
ROUTING_MODEL = "@cf/meta/llama-3.2-1b-instruct"
FINE_TUNED_MODEL = "@cf/meta/llama-3.2-1b-instruct"
```

---

## Controlplane Model Management

### Features
- List available models (base + fine-tuned)
- Select active routing model
- View usage analytics
- Upload/manage LoRA adapters

### API Endpoints
```bash
# List models
GET /v1/models

# Set active model  
POST /v1/models/select
{ "model_id": "intent-routing-v1" }

# Get analytics
GET /v1/analytics
```

---

## Environment Variables

```toml
# wrangler.toml
[runtime_vars]
# Base model for routing
ROUTING_MODEL = "@cf/meta/llama-3.2-1b-instruct"

# Fine-tuned LoRA (optional)
INTENT_LORA = "intent-routing-v1"

# AI Gateway
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/account/..."
```

---

## Next Steps

1. **Set up AI Gateway** in Cloudflare Dashboard
2. **Add model config** to D1 schema
3. **Build model selection UI** in Controlplane
4. **Implement analytics** dashboard
