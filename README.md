<div align="center">

# ⚡ REVIVEAI

### Autonomous Revenue Recovery Intelligence Agent

<p>
  <strong>Don't just detect lost revenue.</strong><br/>
  <strong>Predict it. Explain it. Recover it.</strong>
</p>

<br/>

<img src="https://img.shields.io/badge/Razorpay-Buildathon%202026-020617?style=for-the-badge&logo=razorpay&logoColor=white" />
<img src="https://img.shields.io/badge/AI-Agent-06B6D4?style=for-the-badge&logo=openai&logoColor=white" />
<img src="https://img.shields.io/badge/Next.js-TypeScript-000000?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/Python-ML-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />

<br/><br/>

<img src="https://img.shields.io/github/stars/jagadishnot/revops-agent?style=flat-square&color=06B6D4" />
<img src="https://img.shields.io/github/forks/jagadishnot/revops-agent?style=flat-square&color=8B5CF6" />
<img src="https://img.shields.io/github/last-commit/jagadishnot/revops-agent?style=flat-square&color=22C55E" />

</div>

---

## 🧠 What is ReviveAI?

**ReviveAI** is an autonomous revenue recovery agent designed to identify payment revenue that is at risk and intelligently determine how that revenue should be recovered.

Instead of simply detecting failed payments and sending generic reminders, ReviveAI creates a complete decision and execution loop:

```text
┌───────────────────────────────────────────────────────────────┐
│                       PAYMENT EVENT                            │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                 REVENUE-AT-RISK DETECTION                     │
│                                                               │
│   Failed Payment • Abandoned Checkout • Expired Transaction   │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                    AI DIAGNOSIS                                │
│                                                               │
│     Why did the transaction fail?                             │
│     What recovery path makes sense?                           │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│              ML RECOVERY PROBABILITY                           │
│                                                               │
│       Predict probability that revenue can be recovered       │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                 STRATEGY ENGINE                                │
│                                                               │
│ Retry • Payment Link • Email • WhatsApp • Escalation • Stop   │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                     GUARDRAILS                                │
│                                                               │
│ Retry Limits • Contact Limits • Amount Limits • Time Window   │
│ Incentive Limits • Human Approval • Stop Conditions            │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                  RAZORPAY EXECUTION                            │
│                                                               │
│              Test Mode Payment Recovery                        │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                 WEBHOOK VERIFICATION                           │
│                                                               │
│             payment.captured / payment.failed                 │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│                  AUDIT + OUTCOME                               │
│                                                               │
│       Revenue Recovered • Decision • Action • Audit Trail     │
└───────────────────────────────────────────────────────────────┘

🎯 The Problem

Payment failures and abandoned checkouts represent revenue that a business could potentially recover.

Traditional recovery systems often rely on:

Generic retry schedules
Fixed reminder messages
Manual follow-ups
One-size-fits-all recovery strategies
No recovery probability
No intelligent stopping conditions
Limited visibility into why an action was selected

The problem is not simply:

"Which payments failed?"

The more important question is:

"Which failed payments are worth recovering, what is the best intervention, and when should the system stop?"

That's the problem ReviveAI addresses.

🚀 The ReviveAI Approach

ReviveAI treats revenue recovery as an agentic decision problem.

For every eligible transaction, the system can:

01 — Detect

Identify failed and abandoned transactions that represent revenue at risk.

02 — Diagnose

Analyze transaction and customer signals to determine the likely failure context.

03 — Predict

Use a machine-learning recovery model to estimate the probability of successful recovery.

04 — Decide

Compare potential recovery actions and select the strategy with the highest expected value.

05 — Guard

Apply merchant-defined safety policies before executing an automated action.

06 — Execute

Execute the approved recovery workflow using Razorpay Test Mode.

07 — Verify

Use Razorpay webhook events to verify the actual payment outcome.

08 — Learn / Record

Persist the decision, action, result and audit trail for future analysis.

🧩 Core Intelligence
🔮 Recovery Probability

ReviveAI uses a dedicated ML model to estimate:

P(Recovery | Transaction + Customer Signals)

The prediction incorporates signals such as:

Transaction amount
Failure reason
Payment method
Retry count
Customer history
Previous failures
Customer segment
Lifetime value
Checkout behavior
Abandonment indicators

The model produces a probability such as:

Recovery Probability
        ↓
      63.65%

This probability then becomes an input to the strategy engine.

🩺 Intelligent Diagnosis

Different payment failures require different responses.

Examples:

Situation	Potential Recovery
Temporary bank/network issue	Retry
Customer abandoned checkout	Payment Link
UPI-related failure	Alternative payment flow
High-value customer	Higher-priority intervention
Repeated unsuccessful attempts	Stop / Human escalation
Low recovery probability	Stop

ReviveAI avoids blindly applying the same action to every failed payment.

🧠 Adaptive Strategy Engine

The strategy engine evaluates candidate recovery actions.

Possible actions include:

RETRY_PAYMENT
PAYMENT_LINK
SEND_EMAIL
SEND_SMS
SEND_WHATSAPP
OFFER_INCENTIVE
HUMAN_ESCALATION
STOP

The strategy decision considers:

Recovery Probability
        +
Transaction Value
        +
Failure Reason
        +
Customer Value
        +
Previous Failures
        +
Retry Count
        +
Payment Method
        +
Customer Segment
        ↓
Expected Recovery Value
        ↓
Best Action

This allows ReviveAI to move from:

"Send a reminder."

to:

"Choose the intervention with the highest expected recovery value while staying inside merchant-defined limits."

🛡️ Merchant Guardrails

Autonomy without constraints is dangerous in financial workflows.

ReviveAI therefore places a Guardrail Layer between the decision engine and execution layer.

Example policies include:

Maximum Retries
Maximum Incentive %
Maximum Automated Recovery Amount
Maximum Customer Contacts
Recovery Window
Human Approval Threshold
Automation Enabled / Disabled
Minimum Recovery Probability

Example:

                    AI recommends
                         │
                         ▼
                 ┌───────────────┐
                 │  GUARDRAILS   │
                 └───────┬───────┘
                         │
             ┌───────────┴───────────┐
             │                       │
          APPROVE                  BLOCK
             │                       │
             ▼                       ▼
        Execute action          Stop / Escalate

This creates bounded autonomy instead of unrestricted automation.

💳 Razorpay Integration

ReviveAI integrates with Razorpay Test Mode to demonstrate the complete recovery loop safely.

The execution flow is:

ReviveAI Agent
      ↓
Recovery Strategy
      ↓
Razorpay Payment Link
      ↓
Customer Payment
      ↓
Razorpay
      ↓
payment.captured
      ↓
Webhook
      ↓
ReviveAI
      ↓
Transaction = SUCCESS
      ↓
Revenue At Risk = ₹0
      ↓
Audit Log
🔥 Verified Test Mode Recovery

During development, ReviveAI successfully completed an end-to-end Razorpay Test Mode recovery:

Recovered Revenue
       ₹7,999

This represents an actual Test Mode recovery executed through the application, not a synthetic evaluation result.

📊 Synthetic Evaluation

ReviveAI also includes a reproducible synthetic recovery evaluation environment.

⚠️ These results are synthetic simulation results and are not claims about production Razorpay performance.

Evaluation dataset:

Transactions evaluated     : 3,268
Revenue at risk             : ₹19,141,032
Baseline vs ReviveAI
Metric	Baseline	ReviveAI
Recovered Transactions	965	1,317
Recovery Rate	29.53%	40.30%
Revenue Recovered	₹5,415,435	₹7,148,383
Additional Revenue	—	₹1,732,948
Revenue Lift	—	32.00%
Strategy Distribution
RETRY_PAYMENT       1,494
PAYMENT_LINK          870
SEND_EMAIL            384
SEND_WHATSAPP        337
STOP                  183

The evaluation is intended to demonstrate how adaptive intervention selection can outperform a fixed baseline within the synthetic environment.

🏗️ Architecture
                         ┌──────────────────┐
                         │     Customer     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Next.js UI     │
                         │                  │
                         │ Dashboard        │
                         │ Transactions     │
                         │ Customers        │
                         │ Recovery         │
                         │ AI Agent         │
                         │ Guardrails       │
                         │ Audit            │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │       API Layer           │
                    │                           │
                    │ Transactions              │
                    │ Recovery                  │
                    │ Agent                     │
                    │ Razorpay                  │
                    │ Webhooks                  │
                    └────────────┬──────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 │               │                │
                 ▼               ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌───────────────┐
        │ AI Agent     │ │ ML Model     │ │ Razorpay      │
        │              │ │              │ │ Test Mode     │
        │ Detector     │ │ Random       │ │               │
        │ Diagnosis    │ │ Forest       │ │ Payment Link  │
        │ Strategy     │ │              │ │ Webhooks      │
        │ Guardrails   │ │ Probability  │ │               │
        │ Executor     │ │ Prediction   │ │               │
        │ Auditor      │ │              │ │               │
        └──────┬───────┘ └──────┬───────┘ └───────┬───────┘
               │                │                  │
               └────────────────┼──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Supabase      │
                       │   PostgreSQL     │
                       │                  │
                       │ Transactions     │
                       │ Customers        │
                       │ Recovery Cases   │
                       │ Actions          │
                       │ Decisions        │
                       │ Audit Logs       │
                       │ Guardrails       │
                       └──────────────────┘
🤖 Agent Pipeline

ReviveAI is structured as modular agent components:

agents/
├── orchestrator.ts
├── detector.ts
├── diagnosis.ts
├── predictor.ts
├── strategy.ts
├── guardrails.ts
├── executor.ts
└── auditor.ts
Orchestrator

Coordinates the complete recovery workflow.

Detector

Determines whether a transaction is eligible for recovery.

Diagnosis

Determines the likely failure context.

Predictor

Calls the Python ML service and obtains recovery probability.

Strategy

Evaluates possible interventions and selects the recommended action.

Guardrails

Checks merchant safety policies.

Executor

Executes the approved recovery action.

Auditor

Records decisions, actions and outcomes.

📁 Project Structure
revops-agent/
│
├── app/
│   ├── dashboard/
│   ├── transactions/
│   ├── recovery/
│   ├── customers/
│   ├── agent/
│   ├── guardrails/
│   ├── audit/
│   │
│   └── api/
│       ├── transactions/
│       ├── recovery/
│       ├── agent/
│       ├── customers/
│       ├── razorpay/
│       └── webhooks/
│
├── agents/
│   ├── orchestrator.ts
│   ├── detector.ts
│   ├── diagnosis.ts
│   ├── predictor.ts
│   ├── strategy.ts
│   ├── guardrails.ts
│   ├── executor.ts
│   └── auditor.ts
│
├── components/
│   ├── dashboard/
│   ├── transactions/
│   ├── recovery/
│   ├── agent/
│   └── ui/
│
├── data/
│   └── seed.ts
│
├── lib/
│   ├── prisma.ts
│   ├── razorpay.ts
│   ├── ai.ts
│   └── utils.ts
│
├── ml/
│   ├── create_recovery_dataset.py
│   ├── train_recovery_model.py
│   ├── predict.py
│   ├── predict_service.py
│   ├── train_model.py
│   ├── recovery_evaluation_dataset.csv
│   │
│   └── model/
│       ├── recovery_probability_model.joblib
│       ├── recovery_model_metrics.json
│       └── recovery_feature_importance.csv
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── services/
│   ├── transaction.service.ts
│   ├── recovery.service.ts
│   ├── customer.service.ts
│   └── razorpay.service.ts
│
├── types/
│   ├── transaction.ts
│   ├── recovery.ts
│   └── agent.ts
│
├── generated/
│   └── prisma/
│
├── prisma.config.ts
├── package.json
├── package-lock.json
└── README.md
🖥️ Product Dashboard

The ReviveAI command center provides visibility into:

Revenue Intelligence
Revenue at risk
Current unresolved exposure
Expected recovery
Actual recovered revenue
Recovery rate
Recovery attempts
Transaction Intelligence
Failed payments
Abandoned checkouts
Risk levels
Customer information
Recovery status
Customer Intelligence
Customer segment
Lifetime value
Previous failures
Transaction history
Customer-level revenue exposure
Agent Intelligence
Recovery cases
Recovery probability
Diagnosis
Strategy
Guardrail decision
Execution result
Governance
Merchant guardrails
Audit logs
Agent decisions
Recovery actions
🔐 Security & Safety

ReviveAI is designed around controlled financial automation.

API Secrets

Razorpay secrets are stored through environment variables and are never intended to be exposed to the client.

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

Environment files are excluded from Git:

.env
.env.local
.env.*.local
Payment Safety

The project uses Razorpay Test Mode for development and demonstration.

No real customer money is required for the demo.

Agent Safety

Automated actions are subject to merchant-defined guardrails.

🧪 Technology Stack
<div align="center">
Layer	Technology
Frontend	Next.js
Language	TypeScript
Styling	Tailwind CSS
UI	Lucide
Charts	Recharts
Backend	Next.js API Routes
Database	Supabase PostgreSQL
ORM	Prisma
ML	Python
ML Model	Random Forest
Payments	Razorpay Test Mode
Validation	Zod
Runtime	Node.js + Python
Deployment	Render
</div>
⚙️ Local Development
1. Clone
git clone https://github.com/jagadishnot/revops-agent.git
cd revops-agent
2. Install dependencies
npm install
3. Configure environment variables

Create:

.env

Example:

DATABASE_URL="your_supabase_connection_string"
DIRECT_URL="your_supabase_direct_connection_string"

RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxx"

Never commit .env.

4. Generate Prisma Client
npx prisma generate
5. Run the application
npm run dev

Open:

http://localhost:3000
🔬 ML Pipeline

The recovery model is trained using recovery-focused features.

Transaction Dataset
        ↓
Feature Engineering
        ↓
Train/Test Split
        ↓
Random Forest Classifier
        ↓
Recovery Probability
        ↓
.joblib Model
        ↓
Python Prediction Service
        ↓
Next.js Agent

Prediction service:

ml/predict_service.py

Model:

ml/model/recovery_probability_model.joblib

The TypeScript agent invokes the Python prediction service when a recovery prediction is required.

📈 Revenue Recovery Formula

ReviveAI estimates expected recovery using:

Expected Recovery
=
Transaction Amount
×
Recovery Probability
×
Strategy Effectiveness
−
Intervention Cost

This creates a common value function for comparing recovery strategies.

The system can therefore compare:

Retry
   vs
Payment Link
   vs
Email
   vs
WhatsApp
   vs
Human Escalation
   vs
Stop

instead of blindly selecting one action.

🔄 Recovery Lifecycle
                 ┌───────────────┐
                 │   TRANSACTION │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    DETECT     │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   DIAGNOSE    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    PREDICT    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   STRATEGY    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  GUARDRAILS   │
                 └───────┬───────┘
                         │
                 ┌───────┴────────┐
                 │                │
              APPROVE           STOP
                 │                │
                 ▼                ▼
             EXECUTE          AUDIT
                 │
                 ▼
             RAZORPAY
                 │
                 ▼
              WEBHOOK
                 │
                 ▼
             VERIFY
                 │
                 ▼
             RECOVERED
                 │
                 ▼
              AUDIT
🧾 Auditability

Every important agent event can be persisted.

Examples:

REVENUE_AT_RISK_DETECTED
DIAGNOSIS_CREATED
RECOVERY_PREDICTION_CREATED
STRATEGY_SELECTED
GUARDRAIL_APPROVED
GUARDRAIL_BLOCKED
PAYMENT_LINK_CREATED
PAYMENT_RECOVERED
HUMAN_ESCALATION
RECOVERY_STOPPED

This makes the system explainable and traceable.

🎬 Demo Flow

A recommended demonstration:

Step 1

Open the dashboard.

Show:

Revenue At Risk
Expected Recovery
Actual Recovery
Recovery Attempts
Step 2

Open a failed transaction.

Step 3

Run the AI Agent.

Show:

Detection
   ↓
Diagnosis
   ↓
Recovery Probability
   ↓
Strategy
   ↓
Guardrails
   ↓
Execution
Step 4

Show the generated Razorpay Payment Link.

Step 5

Complete the Test Mode payment.

Step 6

Show the webhook confirmation.

Step 7

Return to the dashboard.

Show:

Transaction → SUCCESS

Revenue At Risk → ₹0

Actual Recovered → Updated

Audit Trail → RECOVERY_CONFIRMED

This demonstrates the complete closed-loop recovery system.

🧠 Why ReviveAI?

Traditional systems ask:

"Did the payment fail?"

ReviveAI asks:

"How much revenue is at risk?"

"Can it realistically be recovered?"

"Why did it fail?"

"Which intervention has the highest expected value?"

"Is automation allowed?"

"Did the recovery actually succeed?"

That turns payment recovery from a notification workflow into a measurable autonomous revenue operation.

🌐 Roadmap
Phase 1 — Foundation
 Revenue-at-risk detection
 Customer intelligence
 Recovery cases
 Recovery probability model
 Strategy engine
 Guardrails
 Audit trail
Phase 2 — Payment Recovery
 Razorpay Test Mode
 Payment Link workflow
 Webhook verification
 Recovery confirmation
 Revenue recovery analytics
Phase 3 — Advanced Intelligence
 Online model learning
 Strategy experimentation
 Merchant-specific model calibration
 Advanced customer recovery profiles
 Multi-channel production integrations
 Human-in-the-loop approval center
🏆 Buildathon Vision

ReviveAI is built around a simple principle:

Revenue recovery should be treated as an intelligent decision system, not a collection of payment reminders.

The long-term vision is an autonomous revenue operations agent that continuously:

Observe
   ↓
Understand
   ↓
Predict
   ↓
Decide
   ↓
Act
   ↓
Verify
   ↓
Learn

while remaining bounded by merchant-defined policies and financial safety controls.

<div align="center">
⚡ ReviveAI
Predict. Explain. Recover.
<br/>

Built for Razorpay Buildathon 2026

<br/> <a href="https://github.com/jagadishnot/revops-agent"> <img src="https://img.shields.io/badge/VIEW%20SOURCE%20CODE-000000?style=for-the-badge&logo=github&logoColor=white" /> </a>

<br/><br/>

<strong>Autonomous Revenue Recovery Intelligence</strong>

<br/><br/>

⭐ If you find the project interesting, consider starring the repository.

</div> ```
