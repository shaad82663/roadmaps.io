# Chapter 4: Billing, Pricing & Support

> **Phase:** Cloud Foundations | **Difficulty:** Beginner | **SAA-C03 Domain:** Design Cost-Optimised Architectures (20%)

---

## Table of Contents

1. [Chapter Overview](#chapter-overview)
2. [Section 1 – AWS Pricing Models](#section-1--aws-pricing-models)
   - On-Demand
   - Reserved Instances
   - Spot Instances
   - Savings Plans
   - Dedicated Hosts and Dedicated Instances
   - Pricing Model Comparison Cheat Sheet
3. [Section 2 – AWS Free Tier](#section-2--aws-free-tier)
   - 12-Month Free Tier
   - Always Free
   - Short-Term Trials
   - Top Free Tier Services Quick Reference
4. [Section 3 – AWS Pricing Calculator and TCO Calculator](#section-3--aws-pricing-calculator-and-tco-calculator)
   - AWS Pricing Calculator
   - TCO Calculator
   - Worked Example: 3-Tier Web Application
5. [Section 4 – AWS Cost Explorer](#section-4--aws-cost-explorer)
   - Navigation and Filters
   - Granularity and Grouping
   - Forecasting
   - Cost Allocation Tags
   - Reserved Instance and Savings Plan Reports
6. [Section 5 – AWS Budgets](#section-5--aws-budgets)
   - Budget Types
   - Alerts and Notifications
   - Budget Actions
7. [Section 6 – AWS Support Plans](#section-6--aws-support-plans)
   - Plan-by-Plan Breakdown
   - Full Comparison Table
   - Trusted Advisor
   - AWS Personal Health Dashboard
8. [Section 7 – AWS Marketplace](#section-7--aws-marketplace)
   - What Is AWS Marketplace?
   - Licensing Models
   - Real-World Use Cases
9. [Bonus: Other Billing and Cost Tools](#bonus-other-billing-and-cost-tools)
10. [Hands-On Labs](#hands-on-labs)
    - Lab 1: Create a CloudWatch Billing Alarm
    - Lab 2: Set Up a Monthly Budget in AWS Budgets
    - Lab 3: Estimate a 3-Tier Application with the AWS Pricing Calculator
    - Lab 4: Explore Cost Explorer
11. [Certification-Style Practice Questions](#certification-style-practice-questions)
12. [Interview and Exam FAQ](#interview-and-exam-faq)
13. [Chapter Summary and Cheat Sheet](#chapter-summary-and-cheat-sheet)

---

## Chapter Overview

Understanding how AWS charges for its services is as important as knowing how to use them. The AWS SAA-C03 examination dedicates **20% of its total score** to cost-optimised architectures, meaning that every design decision you make must consider the price implication.

This chapter teaches you:

- How AWS prices each of its core compute services and when to use each pricing model.
- What the AWS Free Tier covers and what it does not, so you never get a surprise bill during labs.
- How to estimate costs *before* you build anything using the AWS Pricing Calculator and the TCO Calculator.
- How to monitor, visualise, and forecast costs after you have started using AWS through Cost Explorer.
- How to set guardrails with AWS Budgets to prevent overspending.
- Which support plan is right for a given business requirement — a favourite exam topic.
- How AWS Marketplace simplifies third-party software procurement.

---

## Section 1 – AWS Pricing Models

AWS does not charge a flat subscription fee. Instead, you pay for exactly what you use, and the *way* you commit to that usage dramatically changes the price. There are five primary pricing models.

---

### 1.1 On-Demand

**What it is:**
You pay for compute or database capacity by the second (Linux EC2 and Fargate) or by the hour (Windows EC2, some databases). There is no upfront payment and no long-term commitment. You can start and stop at any time.

**When to use it:**
- Applications with unpredictable workloads that cannot be interrupted.
- Short-term or spike workloads (a marketing campaign that lasts three days).
- New applications where usage patterns are still being explored.
- Development and test environments that run only during business hours.

**How it works — practical example:**
Imagine you launch an `m5.xlarge` EC2 instance running Linux in `us-east-1`. The On-Demand price is approximately **$0.192 per hour** (prices vary; always check the AWS pricing page). If you run it for exactly 72 hours and then terminate it, you pay 72 × $0.192 = **$13.82**. Nothing more.

**Key exam point:**
On-Demand is the *most expensive* per-unit price but provides maximum flexibility. SAA-C03 questions that mention "no long-term commitment", "unpredictable traffic", or "cannot be interrupted" almost always point to On-Demand or a Savings Plan.

---

### 1.2 Reserved Instances (RIs)

**What it is:**
You make a commitment to use a specific instance type in a specific region for a 1-year or 3-year term. In exchange, AWS gives you a significant discount — up to **72%** compared to On-Demand.

**RI Types:**

| RI Type | Flexibility | Max Discount | Use Case |
|---|---|---|---|
| Standard RI | Cannot change instance family | Up to 72% | Stable, predictable workloads |
| Convertible RI | Can exchange for different family/OS/tenancy | Up to 66% | Workloads that might need resizing |
| Scheduled RI | Reserved for specific recurring time windows | Moderate | Batch jobs, end-of-month reports |

**Payment options:**

- **All Upfront:** Pay everything now. Largest discount.
- **Partial Upfront:** Pay a portion now, rest monthly. Medium discount.
- **No Upfront:** Pay monthly with no initial cost. Smallest discount but still cheaper than On-Demand.

**RI Scope:**
- **Regional RI:** Applies to any AZ within the region; provides instance size flexibility (e.g., 2 × m5.large = 1 × m5.xlarge).
- **Zonal RI:** Applies only to a specific AZ; provides capacity reservation in that AZ but no size flexibility.

**What happens to unused RIs?**
The RI capacity runs whether or not your instance is running. If you stop the EC2 instance, you still pay the RI fee. However, AWS allows you to sell unused Standard RIs on the **Reserved Instance Marketplace** (Convertible RIs cannot be sold).

**Real-world scenario:**
A company runs a 24/7 web application on `c5.2xlarge` instances. They have been doing so for two years without interruption and plan to continue. Switching from On-Demand to a 1-year Standard RI with partial upfront would save approximately 40% on that instance. Over a year, on a $0.34/hr instance, this equals roughly **$1,190 saved per instance**.

**Key exam points:**
- "Steady state", "always on", "predictable baseline" → Reserved Instance or Savings Plan.
- Standard RI cannot change instance family; Convertible RI can.
- Regional RIs provide size flexibility within a family; Zonal RIs do not.

---

### 1.3 Spot Instances

**What it is:**
Spot Instances let you bid on unused EC2 capacity. You specify a maximum price you are willing to pay (or use the default, which is the current Spot price). As long as the current Spot price is at or below your max price, your instance runs. If AWS needs that capacity back, it sends a **2-minute interruption notice** before terminating your instance.

**Savings:**
Up to **90%** compared to On-Demand — the largest possible discount for EC2.

**When to use Spot:**
- Batch processing jobs (data analysis, video rendering, genomics pipelines).
- Stateless web services that can tolerate interruptions.
- Big data workloads: EMR clusters, Spark jobs.
- CI/CD build agents.
- Machine learning training jobs that checkpoint progress.

**When NOT to use Spot:**
- Databases with persistent state.
- Long-running web servers handling user sessions.
- Any workload that cannot be interrupted or restarted mid-task.

**Spot concepts you must know for SAA-C03:**

- **Spot Fleet:** A collection of Spot (and optionally On-Demand) instances. You define target capacity and the fleet diversifies across instance types and AZs to minimise interruption.
- **Spot Block (Spot Duration):** You can request a Spot Instance for 1 to 6 hours at a fixed price without interruption. *Note: AWS has deprecated new Spot Block requests as of 2021, but it still appears in older exam questions.*
- **Spot interruption handling:** At the 2-minute warning, your application must checkpoint, drain connections, or gracefully shut down. You can use the Instance Metadata Service to detect the termination notice at `http://169.254.169.254/latest/meta-data/spot/termination-time`.

**Real-world scenario:**
A media company needs to transcode 10,000 video files on the 1st of every month. Each transcode takes 5 minutes. Using On-Demand `c5.4xlarge` at $0.68/hr, running 100 instances for 9 hours would cost **$612**. On Spot at ~$0.07/hr per instance, the same job costs **~$63** — a 90% saving. If an instance is interrupted mid-transcode, the job is requeued. The company saves $549 per month.

**Key exam points:**
- Spot = cheapest, but can be interrupted with 2-minute notice.
- Fault-tolerant, stateless, batch, big data → Spot.
- Spot Fleet diversifies to maintain target capacity even when some Spot pools are exhausted.

---

### 1.4 Savings Plans

**What it is:**
Savings Plans are a flexible discount model (introduced in 2019) that provides savings in exchange for a commitment to a consistent **spend** (measured in $/hour) for 1 or 3 years. Unlike RIs, they are not tied to a specific instance type from day one.

**Three types of Savings Plans:**

| Plan Type | Flexibility | Max Discount vs. On-Demand |
|---|---|---|
| Compute Savings Plan | Any EC2 family, size, AZ, region, OS; also applies to Fargate and Lambda | Up to 66% |
| EC2 Instance Savings Plan | One specific instance family in one region; any size, OS, and AZ within it | Up to 72% |
| SageMaker Savings Plan | Amazon SageMaker compute usage only | Up to 64% |

**How it works:**
You commit to spending, say, $10/hour for 1 year. AWS applies the Savings Plan discount to your usage up to that $10/hr commitment. Any usage beyond the committed amount is charged at On-Demand rates.

**Compute Savings Plan example:**
You run `m5.xlarge` in `us-east-1`. Later you switch to `c5.2xlarge` in `eu-west-1`. Your Compute Savings Plan automatically applies the discount to both — you never need to exchange or modify anything.

**EC2 Instance Savings Plan example:**
You commit to the `m5` family in `us-east-1`. You can run `m5.large`, `m5.xlarge`, `m5.2xlarge`, etc., with the same discount — but only within that family and region.

**Savings Plans vs. Reserved Instances:**

| Factor | Reserved Instances | Savings Plans |
|---|---|---|
| Commitment | Specific instance type (Standard) or family (Convertible) | Dollar amount per hour |
| Flexibility | Instance size within family (regional RI) | Instance family, region, size, OS (Compute SP) |
| Applies to Lambda/Fargate | No | Yes (Compute SP only) |
| Sell unused commitment | Yes (Standard RI Marketplace) | No |
| Management overhead | Higher (must track RI inventory) | Lower (automatic application) |

**Key exam points:**
- Savings Plans are the *modern replacement* for Reserved Instances for most use cases.
- Compute Savings Plan = most flexible; EC2 Instance Savings Plan = highest discount.
- Both require a 1- or 3-year commitment to a $/hour spend level.
- Savings Plans apply to Lambda and Fargate; Reserved Instances do not.

---

### 1.5 Dedicated Hosts and Dedicated Instances

These two options give you physical isolation on dedicated hardware. They are important for compliance and licensing reasons.

**Dedicated Instances:**
- EC2 instances that run on hardware dedicated to a single AWS account.
- You do not control which physical host your instance lands on.
- Other instances from your *own account* may share the same physical host (but never instances from other accounts).
- Per-instance hourly charge + a per-region fee ($2/hr).

**Dedicated Hosts:**
- You rent an entire physical server.
- You choose which instances to place on it.
- You can see the number of sockets and cores on the host — essential for **per-socket or per-core software licences** (e.g., Oracle Database, Windows Server with Software Assurance).
- Available On-Demand or as a 1/3-year reservation (up to 70% discount).
- Supports **Host Affinity** — ensures an instance always returns to the same host after a reboot.

**When to use Dedicated Hosts:**
- You have existing Oracle Database licences that are tied to physical socket count.
- Regulatory requirements mandate that your workloads never share hardware with other organisations.
- You need full visibility into the underlying hardware for compliance audits.

**Key exam points:**
- "Bring Your Own Licence (BYOL)" for per-socket or per-core licences → Dedicated Host.
- "Hardware isolation from other AWS customers" → Dedicated Host or Dedicated Instance.
- Dedicated Host: you manage host affinity and placement; Dedicated Instance: AWS manages placement.

---

### 1.6 Pricing Model Comparison Cheat Sheet

| Model | Discount vs. On-Demand | Commitment | Interruption Risk | Best For |
|---|---|---|---|---|
| On-Demand | 0% (baseline) | None | None | Unpredictable, short-term |
| Reserved Instance (1yr, partial upfront) | ~40% | 1 year | None | Steady-state, predictable baseline |
| Reserved Instance (3yr, all upfront) | ~72% | 3 years | None | Long-term, stable workloads |
| Savings Plan – EC2 Instance | ~72% | 1 or 3 years | None | Steady-state with some flexibility |
| Savings Plan – Compute | ~66% | 1 or 3 years | None | Variable instance types/regions |
| Spot | ~60-90% | None | 2-minute notice | Fault-tolerant, batch, stateless |
| Dedicated Host (On-Demand) | 0% (higher cost) | None | None | BYOL, compliance |
| Dedicated Host (Reserved, 3yr) | ~70% | 3 years | None | Long-term BYOL, compliance |

---

## Section 2 – AWS Free Tier

The AWS Free Tier allows new (and sometimes all) customers to use services without paying, within defined limits. Understanding these limits will protect you from unexpected charges during your certification study labs.

---

### 2.1 The Three Free Tier Categories

#### Category 1: 12-Month Free Tier

Available to **new AWS accounts** for the **first 12 months** from account creation date. After 12 months, standard On-Demand rates apply automatically.

**Key services included:**

| Service | Free Tier Limit |
|---|---|
| Amazon EC2 | 750 hours/month of `t2.micro` or `t3.micro` (Linux or Windows) |
| Amazon S3 | 5 GB standard storage, 20,000 GET requests, 2,000 PUT requests/month |
| Amazon RDS | 750 hours/month of `db.t2.micro` or `db.t3.micro` (single-AZ) |
| Amazon CloudFront | 1 TB data transfer out, 10 million HTTP/HTTPS requests/month |
| Amazon Elastic Load Balancing | 750 hours/month of Classic Load Balancer |
| Amazon DynamoDB | 25 GB storage (Always Free category, not 12-month) |
| Amazon SNS | 1 million publishes/month (Always Free) |
| AWS Lambda | 1 million free requests/month (Always Free) |

**Common trap:** The 750 hours/month for EC2 `t2.micro` is the equivalent of running *one instance continuously* for a full month (31 days × 24 hours = 744 hours). If you run two `t2.micro` instances simultaneously, you burn through 750 hours in ~15 days and start incurring charges for the second instance.

#### Category 2: Always Free

These limits never expire, regardless of account age. They apply to all AWS customers.

| Service | Always Free Limit |
|---|---|
| AWS Lambda | 1 million invocations, 400,000 GB-seconds of compute per month |
| Amazon DynamoDB | 25 GB storage, 25 WCUs, 25 RCUs per month |
| Amazon SNS | 1 million publishes, 100,000 HTTP deliveries, 1,000 email deliveries per month |
| Amazon SQS | 1 million requests per month |
| AWS CloudFormation | No charge for templates or stacks (you pay only for resources created) |
| Amazon CloudWatch | 10 custom metrics, 10 alarms, 1 million API requests per month |
| Amazon Cognito | 50,000 Monthly Active Users (MAU) per month |

#### Category 3: Short-Term Trials

Some services offer free trials for a limited period from the first use (not from account creation):

| Service | Trial |
|---|---|
| Amazon Inspector | 15-day free trial per EC2 instance |
| Amazon GuardDuty | 30-day free trial |
| Amazon Macie | 30-day free trial (1 GB per month always free after) |
| Amazon Redshift | 2 months free with a `dc2.large` node |

---

### 2.2 Monitoring Your Free Tier Usage

AWS provides a **Free Tier Usage Alerts** feature. When you are approaching or exceeding a free tier limit, AWS can send an email notification. Enable this in **Billing and Cost Management > Billing Preferences**.

Additionally, the **AWS Billing Console** shows a "Free Tier" section with a table of every service's free tier limit and your current month-to-date usage.

---

## Section 3 – AWS Pricing Calculator and TCO Calculator

Before spending a single dollar on AWS, you should estimate costs. AWS provides two tools for this.

---

### 3.1 AWS Pricing Calculator

**URL:** [https://calculator.aws/pricing/2/home](https://calculator.aws/pricing/2/home)

The AWS Pricing Calculator is a free, browser-based tool that lets you build an estimate of AWS service costs *before* you provision anything. It replaced the older "Simple Monthly Calculator."

**What it can do:**
- Estimate monthly costs for virtually every AWS service.
- Compare pricing across AWS Regions.
- Model different pricing models (On-Demand vs. Reserved vs. Savings Plans).
- Group estimates into "Groups" (e.g., Web Tier, Database Tier, Networking) for clarity.
- Export estimates as CSV or share via a unique URL.

**How to use it — step by step:**
1. Navigate to `calculator.aws`.
2. Click **Create estimate**.
3. Search for the service you want (e.g., "EC2").
4. Click **Configure**.
5. Choose the region, operating system, instance type, and usage hours.
6. Select the pricing model (On-Demand or Reserved).
7. Click **Save and add service**.
8. Repeat for each service.
9. View the total **Monthly estimate** and **Annual estimate** at the top.

**Practical tip:**
The calculator shows pricing differences between regions side by side. `us-east-1` (N. Virginia) is almost always the cheapest AWS region. If your compliance rules allow, hosting in `us-east-1` can save 5-20% compared to European or Asia-Pacific regions.

---

### 3.2 Total Cost of Ownership (TCO) Calculator

The **TCO Calculator** is designed for organisations that are considering *migrating from on-premises infrastructure to AWS*. It helps you compare:
- The cost of continuing to run physical servers in your own data centre.
- The equivalent cost of running the same workload on AWS.

**URL:** [https://aws.amazon.com/tco-calculator/](https://aws.amazon.com/tco-calculator/)

**What the TCO Calculator accounts for:**
- Server hardware costs (purchase, refresh cycle, depreciation).
- Data centre costs (rent, power, cooling, physical security).
- Networking hardware (switches, load balancers, firewalls).
- IT staff costs (time to rack, configure, maintain physical servers).
- Software licensing costs.
- AWS equivalent monthly charges for the same workloads.

**Key insight:**
In most studies, the TCO Calculator shows AWS is **30-50% cheaper** over a 3-year horizon when total cost of ownership (not just instance price) is factored in. This is because on-premises infrastructure includes hidden costs: power, cooling, hardware refresh, floor space, and staff time.

**When does it appear on the SAA-C03 exam?**
The exam may present a scenario: *"A company wants to justify migrating 200 on-premises servers to AWS. What tool should they use to present a cost comparison to leadership?"* The answer is the **AWS TCO Calculator** (also now called the **AWS Migration Evaluator**).

---

### 3.3 Worked Example: Estimating a 3-Tier Web Application

Let us walk through a realistic estimate for a simple 3-tier application serving a small SaaS product.

**Architecture:**
- **Web Tier:** 2 × `t3.medium` EC2 instances (Linux) behind an Application Load Balancer, running 24/7.
- **Application Tier:** 2 × `t3.large` EC2 instances (Linux), running 24/7.
- **Database Tier:** 1 × `db.t3.medium` RDS MySQL instance, Multi-AZ, running 24/7.
- **Storage:** 100 GB gp3 EBS per instance (6 volumes total), 50 GB S3 Standard.
- **Data Transfer:** 500 GB outbound per month to the internet.

**Region:** `us-east-1` | **Pricing Model:** On-Demand

| Component | Unit Price | Quantity | Hours/Month | Monthly Cost (approx.) |
|---|---|---|---|---|
| ALB | $0.008/LCU + $0.0225/hr | 1 ALB | 730 | ~$20.00 |
| t3.medium EC2 (Linux) | $0.0416/hr | 2 instances | 730 | $60.74 |
| t3.large EC2 (Linux) | $0.0832/hr | 2 instances | 730 | $121.47 |
| db.t3.medium RDS MySQL Multi-AZ | $0.068/hr | 1 instance | 730 | $49.64 |
| gp3 EBS (100 GB each, 6 volumes) | $0.08/GB/month | 600 GB total | - | $48.00 |
| S3 Standard (50 GB) | $0.023/GB/month | 50 GB | - | $1.15 |
| Data Transfer Out (500 GB) | $0.09/GB | 500 GB | - | $45.00 |
| **Total** | | | | **~$346/month** |

**Now, with 1-year Savings Plans (Compute):**
Applying ~40% discount to EC2 and RDS Reserved (1-year, partial upfront):
Estimated savings: ~$80-$100/month.
New total: ~$246-$266/month.

**Over 3 years with 3-year RIs/SPs:** Total savings could reach $4,000+ compared to On-Demand.

This exercise shows why the exam asks architects to consider pricing models from day one of a design.

---

## Section 4 – AWS Cost Explorer

AWS Cost Explorer is a built-in tool inside the Billing and Cost Management console that lets you **visualise, understand, and manage your AWS costs and usage over time**.

**How to access it:**
Billing and Cost Management Console → Cost Explorer → Launch Cost Explorer.

*Note: Cost Explorer must be enabled once per account. After enabling, it may take up to 24 hours for historical data to appear. It retains data for up to 13 months.*

---

### 4.1 Navigation and Filters

When you open Cost Explorer, you see a default bar chart showing your monthly costs broken down by service for the last 6 months.

**Filtering options:**
- **Service:** Show costs for only EC2, or only RDS, etc.
- **Account:** In AWS Organizations, filter by member account.
- **Region:** Identify which region is generating the most spend.
- **Usage Type:** Distinguish between EC2 instance hours, data transfer, EBS storage, etc.
- **Tag:** Filter by cost allocation tags (e.g., `Project: Alpha`, `Team: DevOps`).
- **Instance Type:** See the breakdown between `t3.micro` and `m5.xlarge`.
- **Linked Account:** Useful for consolidated billing setups.

**Grouping options:**
Group by Service, Account, Region, Tag, Usage Type, AZ, API Operation, and more. Changing the "Group By" dramatically changes the insight you get.

---

### 4.2 Granularity

| Granularity | Description | Use Case |
|---|---|---|
| Monthly | One bar per calendar month | High-level trend view |
| Daily | One bar per day | Identify the specific day a cost spike occurred |
| Hourly | One bar per hour (requires Cost Explorer hourly granularity feature) | Debugging sudden cost anomalies; additional charge |

---

### 4.3 Forecasting

Cost Explorer includes a built-in forecasting model. Based on your historical usage patterns, it projects your costs for the next 12 months. You can:
- See a **confidence interval** (upper and lower bound).
- Filter forecasts by service, region, or tag.
- Use this forecast to set AWS Budget thresholds proactively.

**Exam tip:** The forecast uses a linear model based on trends. If you just onboarded 50 new customers last week, the forecast will not account for that sudden change accurately. Always combine automated forecasts with manual review.

---

### 4.4 Cost Allocation Tags

Tags are key-value pairs you attach to AWS resources. For example:
```
Key: Environment    Value: Production
Key: Team           Value: Backend
Key: Project        Value: AlphaApp
```

To use tags in Cost Explorer:
1. Apply tags to your resources (EC2, S3, RDS, etc.).
2. Navigate to Billing → Cost Allocation Tags.
3. Activate the tag keys you want to track.
4. Within 24 hours, those tags appear as filter/group-by options in Cost Explorer.

**Why this matters for the exam:**
A scenario might say: *"A company has 12 teams sharing one AWS account. The CFO wants to see how much each team is spending each month. What should the architect configure?"*
Answer: **Cost Allocation Tags** + **Cost Explorer grouped by tag**.

---

### 4.5 Reserved Instance and Savings Plan Reports

Cost Explorer provides dedicated reports for:
- **RI Utilisation:** Are your Reserved Instances being used, or are you paying for capacity you are not consuming?
- **RI Coverage:** What percentage of your total On-Demand hours could have been covered by RIs?
- **Savings Plan Utilisation:** How much of your committed Savings Plan spend is being consumed?
- **Savings Plan Coverage:** What percentage of eligible spend is covered by Savings Plans?

These reports help you right-size your commitment purchases and identify waste.

---

## Section 5 – AWS Budgets

While Cost Explorer is retrospective (shows what you *have* spent), AWS Budgets is proactive (alerts you *before or as* you spend too much).

**How to access:** Billing and Cost Management → AWS Budgets.

---

### 5.1 Budget Types

AWS Budgets supports four types of budgets:

#### Cost Budget
Track and alert on dollar amounts. Example: "Alert me when my total monthly spend exceeds $500."

#### Usage Budget
Track and alert on units of usage. Example: "Alert me when my EC2 instance-hours exceed 750 in a month" (i.e., you are about to exceed Free Tier).

#### Savings Plans Budget
Track your Savings Plan utilisation or coverage. Example: "Alert me when my Savings Plan utilisation drops below 80% (meaning I am wasting committed spend)."

#### Reservation Budget
Track your Reserved Instance utilisation or coverage. Example: "Alert me when RI coverage of my EC2 fleet drops below 70%."

---

### 5.2 Configuring a Budget — Key Settings

When creating any budget, you configure:

- **Period:** Daily, Monthly, Quarterly, or Annually.
- **Budgeted amount:** The threshold you are tracking (e.g., $100/month).
- **Filters:** Limit the budget scope to a specific service, region, tag, account, etc.
- **Alerts:** Up to 5 alert thresholds per budget. Each can trigger at actual or forecasted spend.
  - *Actual*: triggers after you have already spent that amount.
  - *Forecasted*: triggers when Cost Explorer predicts you *will* exceed the threshold by end of the period.
- **Notification channels:** Email (up to 10 addresses), Amazon SNS topic, or AWS Chatbot (Slack/Teams).

**Example alert setup:**
```
Budget: $200/month for all services
Alert 1: 50% actual → email when $100 is spent
Alert 2: 80% actual → email when $160 is spent
Alert 3: 100% forecasted → email when Cost Explorer predicts overspend
Alert 4: 100% actual → email when $200 is actually reached
```

---

### 5.3 Budget Actions

Budget Actions take it a step further — instead of only sending notifications, AWS Budgets can **automatically respond** to budget breaches.

**Supported actions:**
- **Apply an IAM policy:** Deny an IAM user or role from provisioning more resources once a budget is exceeded.
- **Attach a Service Control Policy (SCP):** In AWS Organizations, restrict member account actions when a budget threshold is hit.
- **Target EC2 or RDS instances for stop:** Automatically stop running instances to halt cost accrual.

**How actions are triggered:**
- Automatically (immediately when threshold is crossed).
- Manually (action is queued but requires approval from an IAM user before execution).

**Real-world scenario:**
A development team has a $500/month budget. The architect configures a Budget Action: when actual spend reaches 90% ($450), automatically apply an IAM deny policy that prevents the team's role from launching new EC2 instances. This forces the team to seek budget approval before spinning up more resources.

---

## Section 6 – AWS Support Plans

AWS Support Plans determine the level of technical support and guidance you receive from AWS. This is one of the most reliably tested topics on the SAA-C03 exam.

---

### 6.1 Plan-by-Plan Breakdown

#### Basic Support (Free — all accounts)

Every AWS account gets Basic Support automatically at no charge.

**What is included:**
- Access to AWS documentation, whitepapers, and support forums.
- AWS Trusted Advisor with 7 core checks only.
- AWS Personal Health Dashboard — personalised service health notifications.
- Customer service for billing and account questions (no technical support).
- No technical case submission.

**Who it is for:** Individuals experimenting with AWS, students, and hobbyists with no production workloads.

---

#### Developer Support (~$29/month or 3% of monthly AWS usage, whichever is higher)

**What is added:**
- **Technical support cases** via the AWS Support Center (email only).
- Response from a **Cloud Support Associate**.
- Business hours access (during business hours in the customer's local region).
- Response time SLAs:
  - General guidance: < 24 business hours.
  - System impaired: < 12 business hours.
- No production system SLAs.
- No phone or chat support.
- One primary contact can open unlimited cases.

**Who it is for:** Individual developers testing or building on AWS before going to production.

---

#### Business Support (~$100/month or 10% of first $10K, 7% of $10K–$80K, etc., whichever is higher)

**What is added:**
- **24/7 access** to Cloud Support Engineers via **email, phone, and live chat**.
- **Full AWS Trusted Advisor checks** (all ~500+ checks, not just the 7 core checks).
- **Infrastructure Event Management (IEM)** available for purchase.
- Response time SLAs:
  - General guidance: < 24 hours.
  - System impaired: < 12 hours.
  - **Production system impaired: < 4 hours.**
  - **Production system down: < 1 hour.**
- AWS Support API access (programmatic case management).
- Contextual guidance for third-party software.
- Unlimited contacts can open cases.

**Who it is for:** Companies with production workloads on AWS. **This is the minimum recommended plan for production environments.**

---

#### Enterprise On-Ramp Support (~$5,500/month or 10% of monthly usage, whichever is higher)

**What is added (on top of Business):**
- Access to a **pool of Technical Account Managers (TAMs)** — not a dedicated TAM, but access to a pool.
- **Concierge Support Team** for billing and account best practices.
- Response time SLAs:
  - Business-critical system down: **< 30 minutes**.
- Annual AWS Well-Architected Reviews.
- Proactive guidance and workshops from the TAM pool.

**Who it is for:** Growing companies that need faster critical-system response and occasional architectural guidance but cannot justify the cost of Enterprise Support.

---

#### Enterprise Support (~$15,000/month or 10% of monthly usage, whichever is higher)

**What is added (on top of Enterprise On-Ramp):**
- A **dedicated Technical Account Manager (TAM)** — a single, named AWS employee who knows your environment.
- **Concierge Support Team** for billing questions.
- **Infrastructure Event Management (IEM)** included at no additional charge (for product launches, migrations).
- Response time SLAs:
  - Business-critical system down: **< 15 minutes**.
- Access to AWS Support Automation Workflows.
- Proactive reviews, training, and roadmap planning with your dedicated TAM.

**Who it is for:** Enterprises and large organisations with mission-critical workloads where downtime is extremely costly.

---

### 6.2 Full Support Plan Comparison Table

| Feature | Basic | Developer | Business | Enterprise On-Ramp | Enterprise |
|---|---|---|---|---|---|
| **Monthly Cost** | Free | $29+ | $100+ | $5,500+ | $15,000+ |
| **Technical Cases** | No | Email (1 contact) | Email/Phone/Chat (unlimited) | Email/Phone/Chat (unlimited) | Email/Phone/Chat (unlimited) |
| **Support Team Level** | - | Cloud Support Associate | Cloud Support Engineer | Sr. Cloud Support Engineer | Sr. Cloud Support Engineer |
| **Response: General** | - | < 24 biz hrs | < 24 hrs | < 24 hrs | < 24 hrs |
| **Response: System Impaired** | - | < 12 biz hrs | < 12 hrs | < 12 hrs | < 12 hrs |
| **Response: Prod Impaired** | - | - | < 4 hrs | < 4 hrs | < 4 hrs |
| **Response: Prod Down** | - | - | < 1 hr | < 1 hr | < 1 hr |
| **Response: Business-Critical Down** | - | - | - | < 30 min | **< 15 min** |
| **Trusted Advisor** | 7 checks | 7 checks | All checks | All checks | All checks |
| **Technical Account Manager (TAM)** | No | No | No | TAM Pool | Dedicated TAM |
| **Concierge Support** | No | No | No | Yes | Yes |
| **IEM** | No | No | For purchase | For purchase | Included |
| **Support API** | No | No | Yes | Yes | Yes |

**Key exam scenarios:**
- "A startup is launching its first production application and wants phone access to AWS support for production issues at the lowest possible cost." → **Business Support**.
- "An enterprise needs a dedicated AWS expert who knows their environment and can respond within 15 minutes to a critical outage." → **Enterprise Support**.
- "A developer building a personal portfolio site wants to ask AWS technical questions via email during business hours." → **Developer Support**.
- "A company wants all 500+ Trusted Advisor checks without paying for a TAM." → **Business Support** is sufficient.

---

### 6.3 AWS Trusted Advisor

Trusted Advisor automatically inspects your AWS account and provides real-time recommendations across five categories:

| Category | Example Checks |
|---|---|
| **Cost Optimisation** | Idle EC2 instances, underutilised Reserved Instances, unassociated Elastic IPs |
| **Performance** | High-utilisation EC2 instances, CloudFront header forwarding configuration |
| **Security** | Security groups with unrestricted access (0.0.0.0/0), MFA not enabled on root, S3 bucket permissions |
| **Fault Tolerance** | EBS volumes without snapshots, EC2 instances not in multiple AZs, RDS without Multi-AZ |
| **Service Limits** | Are you approaching the default limit for any service in your account? |

**Free tier (Basic + Developer):** Only 7 core checks (a subset of Security and Service Limits).
**Business, Enterprise On-Ramp, Enterprise:** All checks across all 5 categories + weekly email notifications.

---

### 6.4 AWS Personal Health Dashboard

The **AWS Personal Health Dashboard** (also called **AWS Health**) provides a personalised view of how AWS service events and maintenance activities **specifically affect your account and the resources you are running**.

This is different from the **AWS Service Health Dashboard** (which shows the global status of all AWS services):
- **Service Health Dashboard** (`status.aws.amazon.com`): Shows whether AWS services are operational globally. It may show "EC2 is healthy in us-east-1" even if you have a specific EC2 issue.
- **Personal Health Dashboard**: Shows events that are specifically relevant to *your* resources. "Your RDS instance `db-prod-01` in `us-east-1a` is affected by the underlying host replacement scheduled for Friday 02:00–04:00 UTC."

**Key features of Personal Health Dashboard:**
- Proactive notifications about upcoming maintenance and replacements.
- Alerts when scheduled events are planned for resources you own.
- Integration with CloudWatch Events/EventBridge for automated response.
- Available to all accounts at no extra charge (Basic Support and above).

---

## Section 7 – AWS Marketplace

### 7.1 What Is AWS Marketplace?

AWS Marketplace is a digital catalogue with thousands of software listings from independent software vendors (ISVs). You can find, subscribe to, and deploy software directly onto AWS, with billing consolidated into your AWS invoice.

**Think of it as:** an app store, but for enterprise software running on AWS infrastructure.

**Categories of software available:**
- Security (firewalls, intrusion detection systems, WAF rules).
- Machine Learning (pre-trained models, ML frameworks).
- DevOps (CI/CD tools, log management, infrastructure monitoring).
- Data and Analytics (ETL tools, BI dashboards, data connectors).
- Business Software (CRM, ERP, collaboration).
- IoT (device management, industrial solutions).
- Infrastructure Software (operating systems, databases, middleware).

---

### 7.2 Licensing Models

AWS Marketplace software is offered under several licensing arrangements:

| Model | Description | Example |
|---|---|---|
| **Free** | Software itself is free; you pay only for underlying AWS compute | pfSense Community Edition |
| **Bring Your Own Licence (BYOL)** | You already own a licence; Marketplace provides the software package | Oracle Database with existing Oracle licence |
| **Hourly** | Pay per hour the software is running, billed alongside EC2 charges | Trend Micro Deep Security |
| **Monthly** | Flat monthly subscription, regardless of usage | Some SaaS security monitoring tools |
| **Annual** | Pre-pay annually for a discount over monthly billing | Enterprise security platforms |
| **Free Trial** | Software is free for a defined trial period, then converts to paid | Many database and analytics tools |
| **Contract** | Negotiate a custom agreement with the vendor through Marketplace | Large enterprise software deals |

**Private Marketplace:**
Enterprises can create a **Private Marketplace** — a curated subset of AWS Marketplace products that have been pre-approved by their IT or procurement team. Employees can then only subscribe to software from the approved list, ensuring compliance with corporate software policies.

---

### 7.3 Real-World Use Cases

**Scenario 1 – Firewall Appliance:**
A company needs a next-generation firewall in its VPC for deep-packet inspection. Instead of building a solution from scratch, they subscribe to Palo Alto VM-Series on AWS Marketplace. The firewall software is deployed onto EC2 instances. All charges — EC2 + Palo Alto licence — appear on one AWS bill.

**Scenario 2 – Data Integration:**
A data engineering team needs a managed Kafka connector. They subscribe to Confluent Platform via Marketplace, deploy it on their existing EKS cluster, and have the charges consolidated into their existing AWS bill with volume discounts applied through their AWS Enterprise Agreement.

**Scenario 3 – BYOL Migration:**
A company migrates its on-premises SQL Server to AWS. They own SQL Server Enterprise licences. They use the SQL Server BYOL AMI from AWS Marketplace, which provides the correct Windows Server + SQL Server base image, and apply their existing licence. They pay only EC2 instance costs.

---

## Bonus: Other Billing and Cost Tools

These tools appear less frequently on the SAA-C03 exam but are worth knowing.

### AWS Cost and Usage Report (CUR)
The most granular cost data available in AWS. Delivered to S3 as a CSV file, it can contain line-item data for every resource every hour. Commonly queried with Amazon Athena or loaded into Amazon Redshift for custom BI dashboards.

### AWS Compute Optimizer
Uses machine learning to analyse CloudWatch metrics for EC2, Lambda, ECS tasks on Fargate, and EBS volumes. It recommends the optimal resource type and size to reduce cost while maintaining or improving performance. Useful for identifying over-provisioned resources.

### AWS Cost Anomaly Detection
Monitors your spending using machine learning to detect unexpected cost spikes. You define a monitor (entire account, specific service, member account, or cost allocation tag) and an alert threshold. When an anomaly is detected (e.g., S3 data transfer suddenly costs $1,000 more than the baseline), you receive an alert. Available within Cost Explorer at no additional charge.

### AWS Savings Plans and RI Recommendations
Located within Cost Explorer, these recommendation engines analyse your last 7, 30, or 60 days of On-Demand usage and suggest specific RI or Savings Plan purchases that would reduce your bill, along with projected savings estimates.

### AWS Billing Conductor
Allows organisations to create custom rate cards and billing groups for internal chargeback or showback. For example, an IT department can apply a 10% markup to member accounts to cover shared infrastructure costs.

---

## Hands-On Labs

> **Before starting any lab:** Confirm your account age and Free Tier status. Navigate to **Billing → Free Tier** and verify you have remaining Free Tier credits.

---

### Lab 1: Create a CloudWatch Billing Alarm

**Objective:** Create a CloudWatch alarm that sends an email alert when your estimated AWS charges exceed $10.

**Free Tier Status:** CloudWatch alarms are within the Always Free tier (up to 10 alarms). SNS email notifications are free within the Always Free tier. **No charges expected.**

> **Important Note — Region Requirement:**
> Billing metrics in CloudWatch are only available in the **US East (N. Virginia) — us-east-1** region. You must be in this region to create billing alarms, regardless of where your other resources run. If you cannot see billing metrics, confirm you are in `us-east-1`.

**Pre-requisite:**
Enable billing alerts in your account:
1. Sign in to the AWS Management Console.
2. Navigate to **Billing and Cost Management**.
3. Click **Billing Preferences** in the left panel.
4. Check **Receive Billing Alerts**.
5. Click **Save preferences**.

**Step-by-step instructions:**

**Step 1 — Open CloudWatch**
1. In the AWS Management Console, ensure you are in **US East (N. Virginia) — us-east-1**.
2. Search for "CloudWatch" in the services search bar and open it.

**Step 2 — Navigate to Alarms**
1. In the left navigation panel, under **Alarms**, click **All Alarms**.
2. Click the orange **Create alarm** button.

**Step 3 — Select a Metric**
1. Click **Select metric**.
2. In the metrics browser, click **Billing**.
3. Click **Total Estimated Charge**.
4. Tick the checkbox next to the metric named **EstimatedCharges** with currency **USD**.
5. Click **Select metric**.

**Step 4 — Configure Alarm Conditions**
1. Under **Metric**, confirm:
   - **Statistic:** Maximum.
   - **Period:** 6 hours (billing metrics update approximately every 6-8 hours).
2. Under **Conditions**, select:
   - **Threshold type:** Static.
   - **Whenever EstimatedCharges is...:** Greater than.
   - **Threshold value:** `10` (this means $10 USD).
3. Click **Next**.

**Step 5 — Configure Notifications**
1. Under **Alarm state trigger**, ensure **In alarm** is selected.
2. Under **Send a notification to the following SNS topic**, click **Create new topic**.
3. Enter a topic name, e.g., `BillingAlerts`.
4. Enter your email address.
5. Click **Create topic**.
6. Click **Next**.

> **Important:** AWS will send a confirmation email to the address you entered. You must click the confirmation link in that email before the alarm can send notifications. Check your spam folder if it does not arrive within 2 minutes.

**Step 6 — Name and Create**
1. Enter an alarm name: `Monthly-Billing-Alert-$10`.
2. Enter a description (optional): `Alert when estimated charges exceed $10`.
3. Click **Next**.
4. Review the configuration and click **Create alarm**.

**Step 7 — Confirm the SNS Subscription**
1. Check the email address you provided.
2. Find the email from AWS Notifications with subject: "AWS Notification - Subscription Confirmation".
3. Click the **Confirm subscription** link.

**Verification:**
1. Return to CloudWatch → All Alarms.
2. Your new alarm should show status **Insufficient data** (this is normal — it takes up to 24 hours for billing data to populate).
3. After 24 hours, if your charges are below $10, the alarm moves to **OK** state.

**Expected outcome:**
You now have an automatic early-warning system. If your AWS spending unexpectedly increases above $10 in a month, you will receive an email before a large bill accumulates.

---

### Lab 2: Set Up a Monthly Budget in AWS Budgets

**Objective:** Create a monthly cost budget of $20 with two alert thresholds (50% and 100%) that send email notifications.

**Free Tier Status:** AWS Budgets provides **2 free budgets** per account per month. Additional budgets cost $0.10/day. Since we are creating 1 budget, **no charges expected.**

**Step-by-step instructions:**

**Step 1 — Open AWS Budgets**
1. Navigate to **Billing and Cost Management**.
2. In the left panel, click **Budgets**.
3. Click **Create budget**.

**Step 2 — Choose Budget Type**
1. Under **Budget setup**, choose **Use a template (simplified)**.
2. Under **Templates**, select **Monthly cost budget**.
3. Click **Next**.

**Step 3 — Configure Budget Details**
1. **Budget name:** `Monthly-Total-Budget`
2. **Budgeted amount:** `20` (USD)
3. **Email recipients:** Enter your email address.
4. Note: The simplified template automatically creates:
   - Alert 1: When actual spend reaches 85% of $20 ($17).
   - Alert 2: When forecasted spend will exceed 100% of $20 ($20).

**Step 4 — Review and Create**
1. Review the summary.
2. Click **Create budget**.

**Step 5 — Customise Alerts (Optional — Advanced)**
If you want more control:
1. Instead of "Use a template", choose **Customize (advanced)**.
2. Under **Budget type**, select **Cost**.
3. Set period to **Monthly**, budgeted amount to **$20**.
4. Under **Filters** (optional): Select specific services to track (e.g., EC2 only).
5. Under **Configure alerts**:
   - Click **Add an alert threshold**.
   - Set: **50% of budgeted amount**, **Actual costs**, email notification.
   - Add another: **100% of budgeted amount**, **Forecasted costs**, email notification.
6. Follow prompts to create the budget.

**Verification:**
1. The budget appears in the Budgets list with status **On track** (assuming you are under threshold).
2. You will see a progress bar showing actual vs. budgeted spend.

**Expected outcome:**
You now have a proactive guardrail. You will receive an email at 50% and 100% usage, giving you time to investigate and take action before a significant overrun occurs.

---

### Lab 3: Estimate a 3-Tier Web Application with the AWS Pricing Calculator

**Objective:** Use the AWS Pricing Calculator to estimate monthly costs for the 3-tier application described in Section 3.3.

**Free Tier Status:** The AWS Pricing Calculator is a free browser-based tool. **No AWS account or login required. No charges possible.**

**Step-by-step instructions:**

**Step 1 — Open the Calculator**
1. Open a browser and navigate to [https://calculator.aws/pricing/2/home](https://calculator.aws/pricing/2/home).
2. Click **Create estimate**.

**Step 2 — Add the Application Load Balancer**
1. Click **Add service**.
2. Search for "Elastic Load Balancing" and click **Configure**.
3. Region: **US East (N. Virginia)**.
4. Under **Application Load Balancer**, enter:
   - Number of ALBs: **1**
   - Average number of new connections per second: **100**
   - Average connection duration: **3 minutes**
   - Average request size: **10 KB**
5. Click **Save and add service**.

**Step 3 — Add the Web Tier EC2 Instances**
1. Click **Add service** again.
2. Search for "EC2" and click **Configure**.
3. Region: **US East (N. Virginia)**.
4. Under **EC2 Instances**:
   - Operating system: **Linux**.
   - Number of instances: **2**.
   - Search for instance type: `t3.medium`.
   - Usage: **On-Demand**, **100% utilised**, **730 hours/month**.
5. Under **Amazon EBS**:
   - Volume type: **gp3**
   - Storage amount: **100 GB**
   - Quantity: **2** (one per instance)
6. Click **Save and add service**.

**Step 4 — Add the Application Tier EC2 Instances**
1. Repeat Step 3, but this time:
   - Instance type: `t3.large`
   - Number of instances: **2**
   - EBS: **100 GB gp3**, **2 volumes**

**Step 5 — Add the RDS Database**
1. Click **Add service**.
2. Search for "RDS" and click **Configure**.
3. Region: **US East (N. Virginia)**.
4. Select **MySQL** as the database engine.
5. DB instance type: `db.t3.medium`.
6. Deployment: **Multi-AZ DB instance** (note how the price doubles compared to Single-AZ).
7. Storage: **100 GB** gp2 or gp3.
8. Usage: **730 hours/month**.
9. Click **Save and add service**.

**Step 6 — Add S3 Storage**
1. Click **Add service**.
2. Search for "S3" and click **Configure**.
3. S3 Standard storage: **50 GB**.
4. GET requests: **100,000/month**, PUT requests: **10,000/month**.
5. Data transfer out to internet: **500 GB/month**.
6. Click **Save and add service**.

**Step 7 — Review the Total Estimate**
1. Review the **Total monthly cost** shown at the top of the page.
2. You can expand each service card to see the cost breakdown.
3. Click **Export** to download a CSV copy of the estimate.
4. Click **Share** to generate a shareable URL you can send to a colleague or manager.

**Compare pricing models:**
1. Go back to the EC2 and RDS services in your estimate.
2. Change the EC2 purchase option from **On-Demand** to **1-year Reserved Instance (partial upfront)**.
3. Note the price difference.
4. This demonstrates the direct cost benefit of commitment-based pricing.

**Expected outcome:**
You now have a detailed line-item cost estimate that you could present in a design review or use to justify a budget request. The exercise also reinforces how each architecture decision (Multi-AZ vs. Single-AZ, On-Demand vs. Reserved) directly translates to monthly costs.

---

### Lab 4: Explore AWS Cost Explorer

**Objective:** Enable Cost Explorer, navigate its views, apply filters, and review a forecast.

**Free Tier Status:** Cost Explorer is free to enable and use for standard monthly/daily views. Hourly granularity is an additional $0.01 per 1,000 requests. For this lab, we use only free monthly/daily views. **No significant charges expected.**

> **Note:** If your AWS account is brand new (less than a week old), Cost Explorer may have minimal or no data to display. In that case, you can still enable it and explore the interface. Data populates over the first few days of account usage.

**Step-by-step instructions:**

**Step 1 — Enable Cost Explorer**
1. Navigate to **Billing and Cost Management**.
2. Click **Cost Explorer** in the left panel.
3. If you see a "Welcome to Cost Explorer" screen, click **Launch Cost Explorer**.
4. Wait up to 24 hours for historical data to fully appear (for new accounts).

**Step 2 — Default View Overview**
1. The default view shows **Monthly costs by service** as a bar chart.
2. Review the legend — each colour represents a different AWS service.
3. Hover over a bar to see the breakdown by service for that month.

**Step 3 — Apply a Filter**
1. On the right panel, under **Filters**, click **Service**.
2. Type "EC2" and select **EC2-Instances**.
3. Click **Apply**.
4. The chart now shows only EC2 instance charges. Notice the data changes.
5. Remove the filter by clicking the X next to "EC2-Instances".

**Step 4 — Change the Group By**
1. Under **Group by**, change from **Service** to **Region**.
2. The chart now shows your costs broken down by AWS region.
3. This helps you identify if any unexpected region is generating charges (perhaps from a forgotten resource).
4. Change back to **Group by: Service**.

**Step 5 — Change Granularity to Daily**
1. Under **Date range**, click **Last 30 days**.
2. Change **Granularity** from **Monthly** to **Daily**.
3. The chart now shows daily cost bars.
4. This view is useful for identifying the exact day when a cost spike started.

**Step 6 — View the Forecast**
1. Change the **Date range** to include future months.
2. Set the start date to 3 months ago and end date to 3 months in the future.
3. The chart will show historical bars (solid colour) and forecast bars (lighter/hatched colour).
4. This shows Cost Explorer's projection of your future spend based on current trends.

**Step 7 — Cost Allocation Tags (if applicable)**
1. If you have tagged any resources, go to **Billing → Cost Allocation Tags**.
2. Find your tag key and click **Activate**.
3. Return to Cost Explorer after 24 hours.
4. Under **Group by**, select your tag key. Your costs will now be broken down by tag value.

**Step 8 — Save a Report**
1. Configure a view you find useful (e.g., Monthly costs by service for the last 6 months).
2. Click **Save to report library**.
3. Give it a name (e.g., "Monthly Services Overview").
4. Access saved reports anytime from the Cost Explorer left navigation.

**Expected outcome:**
You understand how to navigate Cost Explorer, apply filters, change granularity, and read forecasts. These skills directly apply to the SAA-C03 exam, which may show a scenario where you need to identify *which* service or region is unexpectedly generating costs.

---

## Certification-Style Practice Questions

Answer these questions before checking the explanations. These simulate real SAA-C03 question formats.

---

**Question 1**
A company runs a web application that experiences highly variable traffic, with no predictable pattern. The application must handle traffic spikes instantly and cannot tolerate interruptions. Which EC2 pricing model should the solutions architect recommend?

A. Reserved Instances (1-year, all upfront)
B. Spot Instances with a Spot Fleet
C. On-Demand Instances
D. Dedicated Hosts

> **Answer: C**
> **Explanation:** The key requirements are "unpredictable traffic" and "cannot tolerate interruptions." Spot Instances can be interrupted (eliminates B). Reserved Instances require a predictable commitment and do not scale dynamically for spikes (eliminates A). Dedicated Hosts are for licensing or compliance, not variable traffic (eliminates D). On-Demand provides the required instant scalability with no interruption risk.

---

**Question 2**
A financial services company runs EC2 instances continuously for a critical trading platform. The instances use the `c5.4xlarge` type and have been running for 18 months with no planned changes. The company wants to reduce costs significantly without changing the architecture. Which option provides the largest discount?

A. Compute Savings Plan (1-year, no upfront)
B. EC2 Instance Savings Plan (3-year, all upfront)
C. Standard Reserved Instance (3-year, all upfront)
D. Convertible Reserved Instance (3-year, all upfront)

> **Answer: C**
> **Explanation:** For a specific, stable instance type (`c5.4xlarge`) with a 3-year, all-upfront commitment, Standard Reserved Instances provide the highest discount — up to 72%. EC2 Instance Savings Plans for the same term and upfront option would offer slightly less (up to ~72% for the specific family, but Standard RI can squeeze out the absolute maximum). In practice, Standard RI and EC2 Instance SP are very close, but Standard RI is the traditional answer for "highest discount on a specific, unchanging instance." Compute Savings Plans are more flexible but give slightly less discount.

---

**Question 3**
A company has deployed a batch data processing application that runs nightly for 4 hours. The job processes log files and can be restarted from a checkpoint if interrupted. The company wants the lowest possible compute cost. Which purchasing option is most appropriate?

A. On-Demand Instances
B. Spot Instances
C. Reserved Instances (1-year)
D. Dedicated Instances

> **Answer: B**
> **Explanation:** Spot Instances are up to 90% cheaper than On-Demand. The workload is a batch job (fault-tolerant, can restart from checkpoints), which is the ideal use case for Spot. The job runs nightly so the total compute time is predictable but short — not worth a Reserved Instance commitment for only 4 hours per night. On-Demand would work but is not cost-optimal. Dedicated Instances are not relevant here.

---

**Question 4**
A company is considering migrating 500 on-premises servers to AWS. The CTO wants a report showing the total cost comparison over a 3-year period, including hardware, data centre, and staff costs. Which AWS tool should the solutions architect use?

A. AWS Pricing Calculator
B. AWS Cost Explorer
C. AWS TCO Calculator (Migration Evaluator)
D. AWS Budgets

> **Answer: C**
> **Explanation:** The AWS TCO Calculator (now branded as AWS Migration Evaluator) is specifically designed to compare on-premises TCO against AWS costs for migration planning. It accounts for hardware, data centre overhead, power, cooling, and staff costs. The Pricing Calculator estimates only AWS service costs (not on-premises), and Cost Explorer shows historical spending for accounts already on AWS. Budgets is for spend monitoring, not migration planning.

---

**Question 5**
A solutions architect wants to estimate the monthly cost of a new AWS infrastructure project before provisioning any resources. The architecture includes EC2, RDS, S3, and CloudFront across two regions. Which tool should they use?

A. AWS Cost Explorer
B. AWS Budgets
C. AWS Pricing Calculator
D. AWS Trusted Advisor

> **Answer: C**
> **Explanation:** The AWS Pricing Calculator is for *pre-deployment* cost estimation without any actual AWS resources. Cost Explorer requires an existing AWS account with usage history. Budgets is for monitoring active spending. Trusted Advisor reviews existing configurations for best practices.

---

**Question 6**
A company is running a development environment on EC2 and wants to receive an alert when their monthly AWS charges are likely to exceed $500, even before the month ends. Which service and which alert type should they configure?

A. AWS Cost Explorer with a monthly report
B. AWS Budgets with a **forecasted** cost alert at 100%
C. AWS Budgets with an **actual** cost alert at 100%
D. AWS CloudWatch with a billing alarm at $500

> **Answer: B**
> **Explanation:** The key word is "likely to exceed before the month ends." This requires a *forecasted* alert. AWS Budgets can trigger based on Cost Explorer's forecast, meaning you receive a warning before you actually reach the threshold. An *actual* alert (C) only triggers after you have already spent $500. CloudWatch billing alarms (D) trigger on actual charges, not forecasts. Cost Explorer reports (A) are not alerts.

---

**Question 7**
A company requires that their production system down case be resolved within 15 minutes by a dedicated AWS expert who is familiar with their specific environment. Which AWS Support Plan do they need?

A. Business Support
B. Developer Support
C. Enterprise On-Ramp Support
D. Enterprise Support

> **Answer: D**
> **Explanation:** Only **Enterprise Support** offers: (1) a response SLA of **< 15 minutes** for business-critical system down cases, AND (2) a **dedicated** Technical Account Manager (TAM) who knows the customer's specific environment. Enterprise On-Ramp (C) has a 30-minute SLA and a TAM pool (not dedicated). Business Support (A) has a 1-hour SLA for production down cases.

---

**Question 8**
A developer who is building a personal project on AWS wants to ask AWS technical questions via email during business hours at the lowest possible cost. Which Support Plan should they choose?

A. Basic Support
B. Developer Support
C. Business Support
D. Enterprise On-Ramp Support

> **Answer: B**
> **Explanation:** Basic Support does not include any technical case submissions. Developer Support provides email access to Cloud Support Associates during business hours — exactly what is described — at the lowest cost ($29/month or 3% of usage). Business Support adds 24/7 phone and chat and is more than needed for a personal project.

---

**Question 9**
A company's security team wants to identify all S3 buckets in the AWS account that have public read access enabled. Which AWS service can automatically check this and provide recommendations?

A. Amazon GuardDuty
B. AWS Trusted Advisor
C. AWS Config
D. Amazon Inspector

> **Answer: B**
> **Explanation:** AWS Trusted Advisor has a core **Security** check for "Amazon S3 Bucket Permissions" that identifies buckets with public read or write access. This check is available on all support plans (even Basic). AWS Config and GuardDuty could also detect this, but Trusted Advisor is the most direct and purpose-built tool for this type of best-practice check and the most common answer for this type of question on SAA-C03.

---

**Question 10**
An enterprise company needs to deploy pre-approved firewall software on AWS. The software vendor provides an AMI in AWS Marketplace. The company's IT policy requires that employees only install software from a pre-approved list. Which feature of AWS Marketplace should the architect configure?

A. AWS Marketplace Private Offers
B. AWS Marketplace Private Marketplace
C. AWS Marketplace Free Tier
D. AWS Marketplace Contract Pricing

> **Answer: B**
> **Explanation:** **Private Marketplace** allows an organisation to create a curated subset of approved products from AWS Marketplace. Employees and IAM users can only subscribe to products from this approved catalogue, enforcing corporate software policies. Private Offers are custom pricing arrangements between vendors and specific buyers — not a restriction mechanism.

---

**Question 11**
A company has multiple AWS accounts managed under AWS Organizations. The finance team wants to receive a single consolidated monthly invoice and ensure that Reserved Instance savings from one account benefit all other accounts. What feature enables this?

A. AWS Cost Allocation Tags
B. AWS Consolidated Billing via AWS Organizations
C. AWS Budgets with a cross-account budget
D. AWS Savings Plans at the payer account level

> **Answer: B**
> **Explanation:** **Consolidated Billing** under AWS Organizations combines the usage of all member accounts into the payer (management) account. This means volume pricing discounts and Reserved Instance/Savings Plan benefits are shared across all linked accounts. One invoice covers all accounts. Cost Allocation Tags help track spending but do not consolidate billing.

---

**Question 12**
Which of the following services or features is available to ALL AWS accounts at no additional charge, regardless of support plan? (Select TWO)

A. AWS Trusted Advisor with all 500+ checks
B. AWS Personal Health Dashboard
C. 24/7 phone support for production system outages
D. A dedicated Technical Account Manager
E. AWS Service Health Dashboard

> **Answer: B and E**
> **Explanation:** Both the **Personal Health Dashboard** and the **Service Health Dashboard** are available to all AWS accounts at no charge. Trusted Advisor with all checks requires Business Support or higher (A is wrong). 24/7 phone support requires Business Support (C is wrong). A dedicated TAM requires Enterprise Support (D is wrong).

---

## Interview and Exam FAQ

**Q: What is the difference between Cost Explorer and AWS Budgets?**
A: Cost Explorer is a retrospective analytics tool — it visualises what you *have already spent*. AWS Budgets is a proactive alert and control tool — it notifies you when you *are approaching or exceeding* a spending threshold. Cost Explorer can also forecast future costs, which Budgets uses to generate forecasted alerts.

**Q: Can you sell Convertible Reserved Instances on the Reserved Instance Marketplace?**
A: No. Only **Standard Reserved Instances** can be listed for sale on the Reserved Instance Marketplace. Convertible RIs can be exchanged for other Convertible RIs of equal or greater value, but they cannot be sold.

**Q: What is the minimum response time for a production system that is completely down, and which support plan provides it?**
A: The minimum response time guarantee for a complete production system outage is **< 1 hour** under **Business Support**. Enterprise On-Ramp and Enterprise offer faster SLAs for *business-critical* system outages (30 minutes and 15 minutes, respectively), but those tiers distinguish between "production down" and "business-critical down." The first tier to offer sub-1-hour SLA for production down is Business.

**Q: Does the AWS Free Tier automatically apply, or do you need to opt in?**
A: The Free Tier applies automatically to all new accounts and eligible "Always Free" services. There is no opt-in required. However, you *should* enable Free Tier usage alerts in Billing Preferences to receive notifications if you are approaching limits.

**Q: What is Consolidated Billing, and how does it work with Reserved Instances?**
A: Consolidated Billing is a feature of AWS Organizations where a single payer (management) account receives one combined invoice for all member accounts. If Account A has an unused Reserved Instance and Account B has matching On-Demand usage, the RI discount is automatically applied to Account B's charges — RI savings are shared across the organisation. This is a major cost benefit of using AWS Organizations.

**Q: What is the difference between Savings Plans and Reserved Instances for exam purposes?**
A: Savings Plans are the more modern, flexible alternative to Reserved Instances. The key differences: (1) Savings Plans commit to a $/hour spend; RIs commit to a specific instance. (2) Compute Savings Plans apply to Lambda and Fargate; RIs do not. (3) Standard RIs can be sold on the Marketplace; Savings Plans cannot. (4) EC2 Instance Savings Plans offer slightly less flexibility than regional Standard RIs but roughly the same discount. Both require 1- or 3-year terms.

**Q: What happens if you do not use your Reserved Instance capacity?**
A: You still pay for it. Reserved Instances are a billing discount, not a use-it-or-lose-it capacity block (Zonal RIs do provide a capacity reservation). If your instance is stopped, the RI charge continues. The only way to avoid the charge is to sell the RI on the Reserved Instance Marketplace (Standard RIs only) or modify/exchange it to another instance type (Convertible RIs only).

**Q: What is the TCO Calculator and when would you use it?**
A: The TCO Calculator (now AWS Migration Evaluator) compares the total cost of running workloads on-premises versus on AWS over a 3-5 year horizon. It is used in the *planning phase* of a migration, typically to justify the business case to leadership. It accounts for hardware depreciation, data centre costs, power, cooling, and staff. The AWS Pricing Calculator, by contrast, estimates only the AWS-side costs.

**Q: Can a Budget Action stop EC2 instances automatically?**
A: Yes. Budget Actions can be configured to stop EC2 or RDS instances when a budget threshold is breached. Actions can also apply IAM policies (to restrict further provisioning) or Service Control Policies (SCPs) at the AWS Organizations level. Actions can trigger automatically or require manual approval.

**Q: When does AWS send a Spot Instance interruption notice?**
A: AWS sends the interruption notice **2 minutes before** terminating a Spot Instance. Your application can check the Instance Metadata Service (IMDS) endpoint `http://169.254.169.254/latest/meta-data/spot/termination-time` to detect this notice and begin a graceful shutdown. The EC2 instance will also receive a CloudWatch event and an EventBridge event at the time of interruption.

**Q: What are the 5 categories of AWS Trusted Advisor checks?**
A: Cost Optimisation, Performance, Security, Fault Tolerance, and Service Limits. Basic and Developer Support plans include only 7 core checks (primarily security and service limits). Business, Enterprise On-Ramp, and Enterprise plans include all checks across all 5 categories.

---

## Chapter Summary and Cheat Sheet

### Pricing Model Quick Reference

| If the scenario says... | Recommend... |
|---|---|
| "Unpredictable workload, no interruptions" | On-Demand |
| "Steady-state, always-on, 1-3 years, no flexibility needed" | Standard Reserved Instance |
| "Steady-state but may change instance family or region" | Compute Savings Plan |
| "Batch job, can be restarted, fault-tolerant" | Spot Instances |
| "Oracle/Windows BYOL, need physical socket count" | Dedicated Hosts |
| "Compliance requires hardware isolation from other customers" | Dedicated Hosts or Dedicated Instances |
| "Variable workload, also runs Lambda/Fargate" | Compute Savings Plan |

---

### Support Plan Quick Reference

| Scenario says... | Answer |
|---|---|
| "No technical support needed" | Basic |
| "Email support, business hours, developer testing" | Developer |
| "24/7 phone support, production workloads, lowest cost" | Business |
| "Critical system down in < 30 min, no dedicated TAM" | Enterprise On-Ramp |
| "Dedicated TAM, < 15 min critical response" | Enterprise |
| "Need all Trusted Advisor checks" | Business (minimum) |

---

### Key Numbers to Memorise

| Item | Value |
|---|---|
| Reserved Instance max discount | 72% (Standard, 3yr, all upfront) |
| Spot Instance max discount | ~90% vs. On-Demand |
| Compute Savings Plan max discount | ~66% |
| Free Tier EC2 per month | 750 hours of t2.micro or t3.micro |
| Free Tier S3 storage | 5 GB Standard |
| Free Tier Lambda invocations | 1 million/month (Always Free) |
| Free Tier DynamoDB storage | 25 GB (Always Free) |
| Budget Actions can restrict | IAM Policies, SCPs, Stop EC2/RDS |
| Cost Explorer data retention | 13 months |
| Spot interruption notice | 2 minutes before termination |
| Developer Support start price | $29/month |
| Business Support start price | $100/month |
| Enterprise On-Ramp start price | $5,500/month |
| Enterprise Support start price | $15,000/month |

---

### Tool Selection Summary

| Tool | When to Use |
|---|---|
| **AWS Pricing Calculator** | Before provisioning: estimate costs for a new design |
| **TCO Calculator / Migration Evaluator** | Justify migration: compare on-premises TCO vs. AWS |
| **Cost Explorer** | After provisioning: analyse, visualise, and forecast actual spend |
| **AWS Budgets** | Proactive alerts: notify or act when spend thresholds are approached |
| **Trusted Advisor** | Best-practice checks: security, cost, performance, fault tolerance |
| **Compute Optimizer** | Rightsizing: ML-based EC2/Lambda/EBS/ECS recommendations |
| **Cost Anomaly Detection** | Unexpected spike detection: ML-based alerts for cost anomalies |
| **Cost and Usage Report (CUR)** | Granular data: per-resource, per-hour billing data for BI analysis |

---

*End of Chapter 4 — Billing, Pricing & Support*

> **Next Chapter:** Chapter 5 — EC2 Fundamentals (Compute & Networking Phase begins)
