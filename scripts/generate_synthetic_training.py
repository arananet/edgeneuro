import json
import random
import sys

# Mock list of Agents and their Intent Domains
AGENTS = {
    "agent_hr": ["payroll issue", "holiday request", "benefits question", "onboarding"],
    "agent_it": ["vpn access", "password reset", "laptop repair", "software license"],
    "agent_sales": ["customer lead", "sales report", "crm update", "contract renewal"],
    "agent_data": ["sql query", "dashboard access", "data warehouse", "snowflake"]
}

TEMPLATES = [
    "I need help with {intent}",
    "Can you check my {intent}?",
    "Who handles {intent}?",
    "It seems my {intent} is broken",
    "Quick question about {intent}"
]

def generate_sample(agent, intent):
    """
    Generates a synthetic training example.
    In a real scenario, this would call an LLM API (OpenAI/Anthropic) 
    to generate distinct, high-quality variations.
    """
    utterance = random.choice(TEMPLATES).format(intent=intent)
    
    # Add noise/typos simulation
    if random.random() < 0.1:
        utterance = utterance.lower()
    
    return {
        "instruction": "Route the user query to the correct internal agent. Output JSON.",
        "input": utterance,
        "output": json.dumps({
            "target": agent,
            "confidence": 1.0,
            "reason": f"Matched intent: {intent}"
        })
    }

def main():
    print("🧠 Generating Synthetic Training Data for EdgeNeuro...")
    dataset = []
    
    # Generate balanced dataset (Geometric Separation)
    SAMPLES_PER_INTENT = 50 
    
    for agent, intents in AGENTS.items():
        for intent in intents:
            for _ in range(SAMPLES_PER_INTENT):
                dataset.append(generate_sample(agent, intent))
    
    # Shuffle
    random.shuffle(dataset)
    
    filename = "edgeneuro_training_data.jsonl"
    with open(filename, "w") as f:
        for entry in dataset:
            f.write(json.dumps(entry) + "\n")
            
    print(f"✅ Generated {len(dataset)} examples in {filename}")
    print("👉 Next step: Use this file to fine-tune Llama-3-8B")

if __name__ == "__main__":
    main()
