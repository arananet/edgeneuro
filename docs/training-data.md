# Sample Training Data for IT & HR Intent Classification

## Dataset Format (JSONL)

```json
{"query": "I need to request vacation days", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "My VPN is not connecting", "intent": "it_vpn", "agent": "agent_it"}
```

---

## HR Intent Examples (50+)

### vacation / PTO
```json
{"query": "I need to request vacation days", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "How do I request PTO?", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "I want to book some time off", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "Can I take a vacation next week?", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "I need to request paid time off", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "How many vacation days do I have left?", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "I want to check my PTO balance", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "Book vacation for me", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "I need holidays off", "intent": "hr_vacation", "agent": "agent_hr"}
{"query": "Submit vacation request", "intent": "hr_vacation", "agent": "agent_hr"}
```

### sick leave
```json
{"query": "I'm sick and need to call in", "intent": "hr_sick", "agent": "agent_hr"}
{"query": "I need a sick day", "intent": "hr_sick", "agent": "agent_hr"}
{"query": "How do I report sick leave?", "intent": "hr_sick", "agent": "agent_hr"}
{"query": "I won't be in today due to illness", "intent": "hr_sick", "agent": "agent_hr"}
{"query": "Sick leave policy", "intent": "hr_sick", "agent": "agent_hr"}
```

### benefits
```json
{"query": "What are my benefits?", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "Tell me about health insurance", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "I need information about dental coverage", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "What does my pension plan include?", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "Explain my employee benefits", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "I want to enroll in benefits", "intent": "hr_benefits", "agent": "agent_hr"}
{"query": "Update my benefits selection", "intent": "hr_benefits", "agent": "agent_hr"}
```

### salary / payroll
```json
{"query": "When do I get paid?", "intent": "hr_payroll", "agent": "agent_hr"}
{"query": "I have a question about my salary", "intent": "hr_payroll", "agent": "agent_hr"}
{"query": "How is my paycheck calculated?", "intent": "hr_payroll", "agent": "agent_hr"}
{"query": "I need my payslip", "intent": "hr_payroll", "agent": "agent_hr"}
{"query": "Tax document request", "intent": "hr_payroll", "agent": "agent_hr"}
```

### onboarding / offboarding
```json
{"query": "I just started, what do I need to do?", "intent": "hr_onboarding", "agent": "agent_hr"}
{"query": "New employee paperwork", "intent": "hr_onboarding", "agent": "agent_hr"}
{"query": "I quitting my job", "intent": "hr_offboarding", "agent": "agent_hr"}
{"query": "Resignation process", "intent": "hr_offboarding", "agent": "agent_hr"}
```

### general hr
```json
{"query": "I have a question for HR", "intent": "hr_general", "agent": "agent_hr"}
{"query": "Talk to human resources", "intent": "hr_general", "agent": "agent_hr"}
{"query": "HR policy question", "intent": "hr_general", "agent": "agent_hr"}
```

---

## IT Intent Examples (50+)

### vpn / network
```json
{"query": "My VPN is not connecting", "intent": "it_vpn", "agent": "agent_it"}
{"query": "VPN issues", "intent": "it_vpn", "agent": "agent_it"}
{"query": "I can't connect to VPN", "intent": "it_vpn", "agent": "agent_it"}
{"query": "How do I set up VPN?", "intent": "it_vpn", "agent": "agent_it"}
{"query": "VPN password reset", "intent": "it_vpn", "agent": "agent_it"}
{"query": "Remote access not working", "intent": "it_vpn", "agent": "agent_it"}
{"query": "I need VPN access", "intent": "it_vpn", "agent": "agent_it"}
{"query": "Wifi not working", "intent": "it_network", "agent": "agent_it"}
{"query": "Network connection issues", "intent": "it_network", "agent": "agent_it"}
```

### password / login
```json
{"query": "I forgot my password", "intent": "it_password", "agent": "agent_it"}
{"query": "Reset my password", "intent": "it_password", "agent": "agent_it"}
{"query": "Can't login to my account", "intent": "it_login", "agent": "agent_it"}
{"query": "Login issues", "intent": "it_login", "agent": "agent_it"}
{"query": "My account is locked", "intent": "it_login", "agent": "agent_it"}
{"query": "Need help logging in", "intent": "it_login", "agent": "agent_it"}
{"query": "Two-factor authentication problems", "intent": "it_login", "agent": "agent_it"}
{"query": "MFA not working", "intent": "it_login", "agent": "agent_it"}
```

### hardware
```json
{"query": "My laptop is broken", "intent": "it_hardware", "agent": "agent_it"}
{"query": "Need a new keyboard", "intent": "it_hardware", "agent": "agent_it"}
{"query": "Request new computer", "intent": "it_hardware", "agent": "agent_it"}
{"query": "Monitor not working", "intent": "it_hardware", "agent": "agent_it"}
{"query": "I need a mouse", "intent": "it_hardware", "agent": "agent_it"}
{"query": "Hardware request", "intent": "it_hardware", "agent": "agent_it"}
{"query": "My screen is black", "intent": "it_hardware", "agent": "agent_it"}
```

### software / apps
```json
{"query": "I need software installed", "intent": "it_software", "agent": "agent_it"}
{"query": "How do I install Zoom?", "intent": "it_software", "agent": "agent_it"}
{"query": "Software license request", "intent": "it_software", "agent": "agent_it"}
{"query": "App not working", "intent": "it_software", "agent": "agent_it"}
{"query": "Need access to application", "intent": "it_software", "agent": "agent_it"}
{"query": "Install Microsoft Office", "intent": "it_software", "agent": "agent_it"}
```

### email
```json
{"query": "Email not working", "intent": "it_email", "agent": "agent_it"}
{"query": "Can't send emails", "intent": "it_email", "agent": "agent_it"}
{"query": "Outlook issues", "intent": "it_email", "agent": "agent_it"}
{"query": "Email quota exceeded", "intent": "it_email", "agent": "agent_it"}
```

### security
```json
{"query": "I think my account was compromised", "intent": "it_security", "agent": "agent_it"}
{"query": "Security incident", "intent": "it_security", "agent": "agent_it"}
{"query": "Need to report suspicious email", "intent": "it_security", "agent": "agent_it"}
{"query": "Phishing email", "intent": "it_security", "agent": "agent_it"}
```

### general it
```json
{"query": "I need IT help", "intent": "it_general", "agent": "agent_it"}
{"query": "Technical support", "intent": "it_general", "agent": "agent_it"}
{"query": "IT department contact", "intent": "it_general", "agent": "agent_it"}
```

---

## Training Command (HuggingFace Autotrain)

```bash
# Upload dataset to HuggingFace as intent-routing dataset
# Then use Autotrain with:
# - Base model: meta-llama/Llama-3.2-1B-Instruct
# - Task: text-classification
# - LoRA: enabled
```

---

## Export for Fine-Tuning

Save as `train.jsonl`:
```bash
# Merge all examples
cat hr_intents.jsonl it_intents.jsonl > train.jsonl
```
