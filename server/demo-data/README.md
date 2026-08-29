# Demo Dataset Documentation

This directory contains demo datasets designed to demonstrate the criminal network analysis capabilities of Cyber Trace AI.

## Dataset Overview

### CDR Dataset (`demo_cdr.csv`)
**Purpose**: Demonstrates call pattern analysis and orchestrator detection

**Key Characters**:
- **9999999999** (CRIMINAL ORCHESTRATOR): Highly centralized node with 10+ connections, coordinates criminal network
- **8888888888, 7777777777, 6666666666, 5555555555, 4444444444**: Criminal network members with call loop patterns
- **8765432109, 7654321098**: Secondary criminal group connected to main orchestrator
- **1234567890, 9876543210**: NORMAL person with regular communication patterns (mainly 2-3 contacts)
- **5544332211, 6677889900**: Another normal person with limited connections

**Patterns Demonstrated**:
1. **High Centrality**: Orchestrator (9999999999) has connections to 10+ different numbers
2. **Call Loops**: Circular calling patterns among criminal members (8888888888 → 7777777777 → 6666666666 → 8888888888)
3. **Normal vs Criminal**: Clear contrast between regular communication patterns and suspicious coordination
4. **Network Bridging**: Orchestrator connects multiple criminal groups

### Financial Dataset (`demo_financial.csv`)
**Purpose**: Demonstrates money laundering detection and financial pattern analysis

**Key Characters**:
- **ACC_CRIM_BOSS** (CRIMINAL ORCHESTRATOR): High-value transactions to multiple mules, high centrality
- **ACC_MULE_1 through ACC_MULE_10**: Money laundering mules in multi-hop chains
- **ACC_CRIM_BOSS_2**: Secondary criminal network boss
- **ACC_NORMAL_1 through ACC_NORMAL_9**: Normal accounts with regular, low-value transactions
- **ACC_BUSINESS_A/B/C**: Legitimate high-value business transactions (for contrast)
- **ACC_STRUCT_1/2/3**: Demonstrates structuring (smurfing) pattern

**Patterns Demonstrated**:
1. **Money Laundering Rings**: Multi-hop chains with amount decay (500K → 450K → 400K → 350K)
2. **High Centrality**: Criminal boss connects to 10+ mule accounts
3. **Structuring**: Frequent small transfers just below reporting thresholds
4. **Reverse Laundering**: Mules returning smaller amounts to boss
5. **Network Connection**: Two criminal networks connected via high-value transfers

## Expected Analysis Results

### When you load these datasets, you should see:

**High-Risk Nodes (Critical - Red)**:
- 9999999999 (CDR orchestrator)
- ACC_CRIM_BOSS (Financial orchestrator)
- ACC_CRIM_BOSS_2 (Secondary criminal boss)

**Medium-Risk Nodes (Yellow)**:
- Criminal network members (8888888888, 7777777777, etc.)
- Money laundering mules (ACC_MULE_1 through ACC_MULE_10)
- Structuring accounts (ACC_STRUCT_1, ACC_STRUCT_2)

**Low-Risk Nodes (Green)**:
- Normal individuals (1234567890, 9876543210, etc.)
- Normal accounts (ACC_NORMAL_1 through ACC_NORMAL_9)
- Business accounts (ACC_BUSINESS_A/B/C)

### Pattern Detection Results:

**Call Loops**: Should detect circular patterns among criminal network members
**Laundering Rings**: Should identify multi-hop money laundering chains
**Frequency Spikes**: Should flag orchestrators with abnormally high connection counts

## How to Use

1. Create a new case in the application
2. Upload `demo_cdr.csv` first
3. Upload `demo_financial.csv` second
4. Analyze the network graph to see the risk-based node coloring
5. Click on high-risk nodes to see their connections
6. Check the right sidebar for detected patterns
7. Export reports for documentation

## Dataset Statistics

- **CDR Records**: 55 records covering multiple days
- **Financial Transactions**: 45 transactions with varying amounts
- **Unique Phone Numbers**: 15+ (mix of criminal and normal)
- **Unique Accounts**: 20+ (mix of criminal and normal)
- **Time Period**: January 15-16, 2024

## Educational Value

This dataset is designed to help investigators understand:
1. How network analysis identifies orchestrators vs normal users
2. The difference between criminal coordination patterns and normal communication
3. How money laundering rings operate through multiple hops
4. The importance of centrality in criminal network detection
5. How pattern detection algorithms work in practice